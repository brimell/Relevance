from datetime import datetime
from enum import Enum
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, HttpUrl, StringConstraints


def reject_dot_git_suffix(value: str) -> str:
    if value.lower().endswith(".git"):
        raise ValueError("repo must not include the .git suffix")
    return value


OwnerName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=39, pattern=r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$")]
RepositoryName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100, pattern=r"^[A-Za-z0-9._-]+$"), AfterValidator(reject_dot_git_suffix)]
GitRef = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]


class APIModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ScanStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class FindingSourceType(str, Enum):
    PAPER = "paper"
    CVE = "cve"


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class Relevance(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class FindingType(str, Enum):
    POTENTIAL_IMPROVEMENT = "potential_improvement"
    CHALLENGES_ASSUMPTION = "challenges_assumption"
    NEW_TECHNIQUE = "new_technique"


class EvidenceLabel(str, Enum):
    STRONG_MATCH = "strong_match"
    WORTH_REVIEWING = "worth_reviewing"
    EXPLORATORY = "exploratory"


class FindingStatus(str, Enum):
    NEW = "new"
    SAVED = "saved"
    DISMISSED = "dismissed"


class IssueState(str, Enum):
    NOT_CREATED = "not_created"
    CREATED = "created"
    FAILED = "failed"


class Repository(APIModel):
    owner: OwnerName
    repo: RepositoryName
    ref: GitRef | None = None


class RepositoryConnection(Repository):
    analysed_sha: str | None = None
    github_connected: bool = False
    created_at: datetime
    updated_at: datetime


class RepositoriesResponse(APIModel):
    repositories: list[RepositoryConnection]
    count: int = Field(ge=0)


class StartScanRequest(APIModel):
    repository: Repository


class ScanProgress(APIModel):
    percent: int = Field(ge=0, le=100)
    stage: str = Field(min_length=1, max_length=120)
    completed_steps: int = Field(ge=0)
    total_steps: int = Field(ge=1)


class Scan(APIModel):
    id: str
    repository: Repository
    status: ScanStatus
    progress: ScanProgress
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None
    analysed_sha: str | None = None
    error: str | None = None


class FindingSource(APIModel):
    type: FindingSourceType
    identifier: str = Field(min_length=1, max_length=200)
    url: HttpUrl
    published_at: datetime | None = None
    authors: list[str] = Field(default_factory=list)


class FileEvidence(APIModel):
    path: str = Field(min_length=1, max_length=500)
    excerpt: str = Field(min_length=1, max_length=2000)


class FindingIssue(APIModel):
    state: IssueState = IssueState.NOT_CREATED
    number: int | None = None
    url: HttpUrl | None = None
    created_at: datetime | None = None
    error: str | None = None


class Finding(APIModel):
    id: str
    scan_id: str
    repository: Repository
    analysed_sha: str
    source: FindingSource
    finding_type: FindingType
    severity: Severity
    relevance: Relevance
    evidence_label: EvidenceLabel
    title: str = Field(min_length=1, max_length=240)
    summary: str = Field(min_length=1, max_length=4000, description="Paper claim or abstract; not a repository inference.")
    why_relevant: str = Field(min_length=1, max_length=3000, description="Model inference connecting the paper to this repository.")
    affected_files: list[FileEvidence] = Field(default_factory=list)
    suggested_action: str = Field(min_length=1, max_length=2000)
    detected_at: datetime
    user_status: FindingStatus = FindingStatus.NEW
    issue: FindingIssue = Field(default_factory=FindingIssue)


class FindingsResponse(APIModel):
    repository: Repository
    scan_id: str | None = None
    findings: list[Finding]
    count: int = Field(ge=0)


class CreateRepositoryRequest(APIModel):
    repository: Repository


class UpdateFindingRequest(APIModel):
    status: FindingStatus


class CreateIssueRequest(APIModel):
    approved: Literal[True]


class IssueCreationResponse(APIModel):
    finding_id: str
    issue: FindingIssue


class ProjectProfile(APIModel):
    repository: Repository
    analysed_sha: str
    summary: str
    objectives: list[str] = Field(default_factory=list)
    methods: list[str] = Field(default_factory=list)
    research_topics: list[str] = Field(default_factory=list)
    key_files: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    generated_at: datetime


class ErrorResponse(APIModel):
    detail: str


class HealthResponse(APIModel):
    status: Literal["ok"] = "ok"
    service: Literal["relevance-bot-api"] = "relevance-bot-api"
    github_connected: bool
    evaluation_configured: bool
