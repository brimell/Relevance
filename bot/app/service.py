from collections import defaultdict
from datetime import UTC, datetime
from threading import RLock
from uuid import NAMESPACE_URL, uuid5

from .models import (
    Finding,
    FindingIssue,
    FindingSource,
    FindingSourceType,
    FindingsResponse,
    IssueCreationResponse,
    IssueState,
    Relevance,
    Repository,
    Scan,
    ScanProgress,
    ScanStatus,
    Severity,
)


class NotFoundError(Exception):
    pass


class ConflictError(Exception):
    pass


def utc_now() -> datetime:
    return datetime.now(UTC)


def repository_key(repository: Repository) -> str:
    return f"{repository.owner.lower()}/{repository.repo.lower()}"


class DemoService:
    """Deterministic in-memory simulation of integrations that do not exist yet."""

    def __init__(self) -> None:
        self._lock = RLock()
        self.reset()

    def reset(self) -> None:
        with self._lock:
            self._scans: dict[str, Scan] = {}
            self._scan_findings: dict[str, list[str]] = {}
            self._findings: dict[str, Finding] = {}
            self._repository_findings: dict[str, list[str]] = defaultdict(list)
            self._scan_counts: dict[str, int] = defaultdict(int)

    def start_scan(self, repository: Repository) -> Scan:
        with self._lock:
            key = repository_key(repository)
            for scan in self._scans.values():
                if repository_key(scan.repository) == key and scan.status in {
                    ScanStatus.QUEUED,
                    ScanStatus.RUNNING,
                }:
                    raise ConflictError(
                        f"A scan for {repository.owner}/{repository.repo} is already active."
                    )

            self._scan_counts[key] += 1
            scan_number = self._scan_counts[key]
            scan_id = str(
                uuid5(
                    NAMESPACE_URL,
                    f"relevance:scan:{key}:{repository.ref or 'default'}:{scan_number}",
                )
            )
            now = utc_now()
            scan = Scan(
                id=scan_id,
                repository=repository,
                status=ScanStatus.QUEUED,
                progress=ScanProgress(
                    percent=0,
                    stage="Waiting for the simulated worker",
                    completed_steps=0,
                    total_steps=2,
                ),
                created_at=now,
                updated_at=now,
            )
            self._scans[scan_id] = scan
            return scan.model_copy(deep=True)

    def get_scan(self, scan_id: str, *, advance: bool = True) -> Scan:
        with self._lock:
            scan = self._scans.get(scan_id)
            if scan is None:
                raise NotFoundError(f"Scan '{scan_id}' was not found.")
            if advance:
                scan = self._advance_scan(scan)
            return scan.model_copy(deep=True)

    def get_scan_findings(self, scan_id: str) -> FindingsResponse:
        with self._lock:
            scan = self._scans.get(scan_id)
            if scan is None:
                raise NotFoundError(f"Scan '{scan_id}' was not found.")
            if scan.status is not ScanStatus.COMPLETED:
                raise ConflictError(
                    f"Scan '{scan_id}' is {scan.status.value}; findings are available after completion."
                )
            findings = [
                self._findings[item_id] for item_id in self._scan_findings[scan_id]
            ]
            return FindingsResponse(
                repository=scan.repository,
                scan_id=scan.id,
                findings=[item.model_copy(deep=True) for item in findings],
                count=len(findings),
            )

    def get_repository_findings(self, owner: str, repo: str) -> FindingsResponse:
        repository = Repository(owner=owner, repo=repo)
        with self._lock:
            ids = self._repository_findings[repository_key(repository)]
            findings = [
                self._findings[item_id].model_copy(deep=True) for item_id in ids
            ]
            return FindingsResponse(
                repository=repository,
                findings=findings,
                count=len(findings),
            )

    def create_issue(self, finding_id: str) -> IssueCreationResponse:
        with self._lock:
            finding = self._findings.get(finding_id)
            if finding is None:
                raise NotFoundError(f"Finding '{finding_id}' was not found.")
            if finding.issue.state is IssueState.CREATED:
                raise ConflictError(f"Finding '{finding_id}' already has an issue.")

            created_at = utc_now()
            issue_token = finding.id.split("-")[0]
            url = (
                "https://example.invalid/github/"
                f"{finding.repository.owner}/{finding.repository.repo}/issues/demo-{issue_token}"
            )
            updated = finding.model_copy(
                update={
                    "issue": FindingIssue(
                        state=IssueState.CREATED,
                        url=url,
                        created_at=created_at,
                    )
                },
                deep=True,
            )
            self._findings[finding_id] = updated
            return IssueCreationResponse(
                finding_id=finding_id,
                url=url,
                created_at=created_at,
            )

    def _advance_scan(self, scan: Scan) -> Scan:
        now = utc_now()
        if scan.status is ScanStatus.QUEUED:
            scan = scan.model_copy(
                update={
                    "status": ScanStatus.RUNNING,
                    "progress": ScanProgress(
                        percent=50,
                        stage="Generating deterministic demo findings",
                        completed_steps=1,
                        total_steps=2,
                    ),
                    "updated_at": now,
                },
                deep=True,
            )
        elif scan.status is ScanStatus.RUNNING:
            scan = scan.model_copy(
                update={
                    "status": ScanStatus.COMPLETED,
                    "progress": ScanProgress(
                        percent=100,
                        stage="Simulated scan completed",
                        completed_steps=2,
                        total_steps=2,
                    ),
                    "updated_at": now,
                    "completed_at": now,
                },
                deep=True,
            )
            self._materialize_findings(scan)
        self._scans[scan.id] = scan
        return scan

    def _materialize_findings(self, scan: Scan) -> None:
        key = repository_key(scan.repository)
        templates = [
            {
                "source": FindingSource(
                    type=FindingSourceType.PAPER,
                    identifier="arXiv:2401.04088",
                    url="https://arxiv.org/abs/2401.04088",
                    published_at=datetime(2024, 1, 8, tzinfo=UTC),
                ),
                "severity": Severity.MEDIUM,
                "relevance": Relevance.HIGH,
                "title": "Review dependency behavior against recent supply-chain research",
                "summary": (
                    "Simulated paper-derived finding for the demo repository. "
                    "No repository content was inspected."
                ),
                "suggested_action": (
                    "Review dependency pinning and provenance checks with the engineering team."
                ),
            },
            {
                "source": FindingSource(
                    type=FindingSourceType.CVE,
                    identifier="CVE-2024-0001-DEMO",
                    url="https://example.invalid/cve/CVE-2024-0001-DEMO",
                    published_at=datetime(2024, 2, 1, tzinfo=UTC),
                ),
                "severity": Severity.HIGH,
                "relevance": Relevance.MEDIUM,
                "title": "Verify whether the simulated vulnerable component is in use",
                "summary": (
                    "Simulated CVE-derived finding. The identifier is intentionally not a real CVE "
                    "and no dependency manifest was inspected."
                ),
                "suggested_action": (
                    "Confirm the installed component version, then upgrade or document non-applicability."
                ),
            },
        ]

        finding_ids: list[str] = []
        for index, template in enumerate(templates, start=1):
            finding_id = str(
                uuid5(NAMESPACE_URL, f"relevance:finding:{scan.id}:{index}")
            )
            finding = Finding(
                id=finding_id,
                repository=scan.repository,
                detected_at=scan.completed_at or scan.updated_at,
                **template,
            )
            self._findings[finding_id] = finding
            self._repository_findings[key].append(finding_id)
            finding_ids.append(finding_id)
        self._scan_findings[scan.id] = finding_ids


demo_service = DemoService()
