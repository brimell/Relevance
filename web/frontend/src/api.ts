export type Repository = {
  owner: string
  repo: string
  ref: string | null
}

export type RepositoryConnection = Repository & {
  analysed_sha: string | null
  github_connected: boolean
  created_at: string
  updated_at: string
}

export type RepositoriesResponse = {
  repositories: RepositoryConnection[]
  count: number
}

export type ProjectProfile = {
  repository: Repository
  analysed_sha: string
  summary: string
  objectives: string[]
  methods: string[]
  research_topics: string[]
  key_files: string[]
  assumptions: string[]
  generated_at: string
}

export type ScanStatus = 'queued' | 'running' | 'completed' | 'failed'

export type Scan = {
  id: string
  repository: Repository
  status: ScanStatus
  progress: {
    percent: number
    stage: string
    completed_steps: number
    total_steps: number
  }
  created_at: string
  updated_at: string
  completed_at: string | null
  error: string | null
  analysed_sha: string | null
}

export type FindingIssue = {
  state: 'not_created' | 'created' | 'failed'
  number: number | null
  url: string | null
  created_at: string | null
  error: string | null
}

export type Finding = {
  id: string
  repository: Repository
  source: {
    type: 'paper' | 'cve'
    identifier: string
    url: string
    published_at: string | null
    authors: string[]
  }
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  relevance: 'high' | 'medium' | 'low'
  title: string
  summary: string
  finding_type: 'potential_improvement' | 'challenges_assumption' | 'new_technique'
  why_relevant: string
  affected_files: Array<{
    path: string
    excerpt: string
  }>
  evidence_label: 'strong_match' | 'worth_reviewing' | 'exploratory'
  analysed_sha: string
  user_status: 'new' | 'saved' | 'dismissed'
  suggested_action: string
  detected_at: string
  issue: FindingIssue
}

export type FindingsResponse = {
  repository: Repository
  scan_id: string | null
  findings: Finding[]
  count: number
}

export type IssueCreationResponse = {
  finding_id: string
  issue: FindingIssue
}

type ErrorResponse = {
  detail?: string | Array<{ msg?: string }>
  error?: string
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const REQUEST_TIMEOUT_MS = 90_000

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(path, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
      signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError(504, 'The bot API took too long to respond. Please try again.')
    }
    throw new ApiError(0, 'The bot API is unavailable. Check the service and try again.')
  }

  if (!response.ok) {
    let message = `The bot API returned ${response.status}.`

    try {
      const body = await response.json() as ErrorResponse
      if (typeof body.detail === 'string') {
        message = body.detail
      } else if (Array.isArray(body.detail)) {
        message = body.detail.map((item) => item.msg).filter(Boolean).join(' ') || message
      } else if (body.error) {
        message = body.error
      }
    } catch {
      // Keep the status-based message when the upstream response is not JSON.
    }

    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<T>
}

export function getRepositories(): Promise<RepositoriesResponse> {
  return request('/api/v1/repositories')
}

export function addRepository(repository: Repository): Promise<RepositoryConnection> {
  return request('/api/v1/repositories', {
    method: 'POST',
    body: JSON.stringify({ repository }),
  })
}

export function getProjectProfile(owner: string, repo: string): Promise<ProjectProfile> {
  return request(`/api/v1/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/profile`)
}

export function getRepositoryFindings(owner: string, repo: string): Promise<FindingsResponse> {
  return request(`/api/v1/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/findings`)
}

export function startScan(repository: Repository): Promise<Scan> {
  return request('/api/v1/scans', {
    method: 'POST',
    body: JSON.stringify({ repository }),
  })
}

export function getScan(scanId: string): Promise<Scan> {
  return request(`/api/v1/scans/${encodeURIComponent(scanId)}`)
}

export function getScanFindings(scanId: string): Promise<FindingsResponse> {
  return request(`/api/v1/scans/${encodeURIComponent(scanId)}/findings`)
}

export function createIssue(findingId: string): Promise<IssueCreationResponse> {
  return request(`/api/v1/findings/${encodeURIComponent(findingId)}/issues`, {
    method: 'POST',
    body: JSON.stringify({ approved: true }),
  })
}

export function updateFindingStatus(findingId: string, status: Finding['user_status']): Promise<Finding> {
  return request(`/api/v1/findings/${encodeURIComponent(findingId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}
