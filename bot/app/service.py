import os
from datetime import UTC, datetime
from threading import RLock
from uuid import uuid4

from .arxiv import ArxivError, PaperProvider, fetch_recent_papers
from .evaluation import EvaluationError, evaluate_with_nebius
from .models import (
    Finding,
    FindingIssue,
    FindingStatus,
    FindingsResponse,
    IssueCreationResponse,
    IssueState,
    ProjectProfile,
    RepositoriesResponse,
    Repository,
    RepositoryConnection,
    Scan,
    ScanProgress,
    ScanStatus,
)
from .pipeline import Evaluator, ResearchPipeline
from .publishing import GitHubIssuePublisher, PublishingError
from .repository import RepositoryIngestionError, RepositorySnapshot, ingest_repository
from .storage import SQLiteStore


class NotFoundError(Exception):
    pass


class ConflictError(Exception):
    pass


class ExternalServiceError(Exception):
    pass


def utc_now() -> datetime:
    return datetime.now(UTC)


class DemoService:
    """Durable repository research service shared with the scheduled pipeline."""

    def __init__(
        self,
        paper_provider: PaperProvider = fetch_recent_papers,
        *,
        store: SQLiteStore | None = None,
        repository_provider=ingest_repository,
        evaluator: Evaluator = evaluate_with_nebius,
        publisher_factory=GitHubIssuePublisher,
        max_findings: int = 5,
    ) -> None:
        self._lock = RLock()
        self._store = store or SQLiteStore()
        self._paper_provider = paper_provider
        self._repository_provider = repository_provider
        self._evaluator = evaluator
        self._publisher_factory = publisher_factory
        self._max_findings = max_findings

    def reset(self) -> None:
        self._store.reset()

    def list_repositories(self) -> RepositoriesResponse:
        repositories = self._store.list_repositories()
        return RepositoriesResponse(repositories=repositories, count=len(repositories))

    def connect_repository(self, repository: Repository) -> RepositoryConnection:
        return self._store.upsert_repository(repository, github_connected=bool(os.getenv("GITHUB_TOKEN")))

    def start_scan(self, repository: Repository) -> Scan:
        with self._lock:
            self.connect_repository(repository)
            if self._store.has_active_scan(repository):
                raise ConflictError(f"A scan for {repository.owner}/{repository.repo} is already active.")
            now = utc_now()
            scan = Scan(
                id=str(uuid4()),
                repository=repository,
                status=ScanStatus.QUEUED,
                progress=ScanProgress(percent=0, stage="Queued", completed_steps=0, total_steps=4),
                created_at=now,
                updated_at=now,
            )
            self._store.save_scan(scan)
            return scan

    def get_scan(self, scan_id: str, *, advance: bool = True) -> Scan:
        with self._lock:
            scan = self._store.get_scan(scan_id)
            if scan is None:
                raise NotFoundError(f"Scan '{scan_id}' was not found.")
            if advance:
                scan = self._advance_scan(scan)
            return scan

    def _advance_scan(self, scan: Scan) -> Scan:
        now = utc_now()
        if scan.status is ScanStatus.QUEUED:
            updated = scan.model_copy(update={
                "status": ScanStatus.RUNNING,
                "progress": ScanProgress(percent=10, stage="Reading repository", completed_steps=0, total_steps=4),
                "updated_at": now,
            })
            self._store.save_scan(updated)
            return updated
        if scan.status is not ScanStatus.RUNNING:
            return scan

        pipeline = ResearchPipeline(
            self._store,
            paper_provider=self._paper_provider,
            repository_provider=self._repository_provider,
            evaluator=self._evaluator,
            max_findings=self._max_findings,
        )
        try:
            snapshot, _profile, findings = pipeline.run(scan)
        except (ArxivError, RepositoryIngestionError, EvaluationError) as exc:
            failed = scan.model_copy(update={
                "status": ScanStatus.FAILED,
                "progress": ScanProgress(percent=50, stage="Scan failed", completed_steps=2, total_steps=4),
                "updated_at": utc_now(),
                "error": str(exc),
            })
            self._store.save_scan(failed)
            return failed
        except Exception:
            failed = scan.model_copy(update={
                "status": ScanStatus.FAILED,
                "progress": ScanProgress(percent=50, stage="Scan failed", completed_steps=2, total_steps=4),
                "updated_at": utc_now(),
                "error": "The repository scan failed unexpectedly.",
            })
            self._store.save_scan(failed)
            return failed

        completed_at = utc_now()
        completed = scan.model_copy(update={
            "status": ScanStatus.COMPLETED,
            "progress": ScanProgress(
                percent=100,
                stage=f"Complete — {len(findings)} grounded finding{'s' if len(findings) != 1 else ''}",
                completed_steps=4,
                total_steps=4,
            ),
            "updated_at": completed_at,
            "completed_at": completed_at,
            "analysed_sha": snapshot.sha,
            "error": None,
        })
        self._store.save_scan(completed)
        return completed

    def get_scan_findings(self, scan_id: str) -> FindingsResponse:
        scan = self._store.get_scan(scan_id)
        if scan is None:
            raise NotFoundError(f"Scan '{scan_id}' was not found.")
        if scan.status is not ScanStatus.COMPLETED:
            raise ConflictError(f"Scan '{scan_id}' is {scan.status.value}; findings are available after completion.")
        findings = self._store.list_findings(scan.repository, scan_id)
        return FindingsResponse(repository=scan.repository, scan_id=scan.id, findings=findings, count=len(findings))

    def get_repository_findings(self, owner: str, repo: str) -> FindingsResponse:
        try:
            connection = self._store.get_repository(owner, repo)
            repository = Repository(owner=connection.owner, repo=connection.repo, ref=connection.ref)
        except KeyError:
            repository = Repository(owner=owner, repo=repo)
        findings = self._store.list_findings(repository)
        return FindingsResponse(repository=repository, findings=findings, count=len(findings))

    def get_project_profile(self, owner: str, repo: str) -> ProjectProfile:
        try:
            connection = self._store.get_repository(owner, repo)
        except KeyError as exc:
            raise NotFoundError(f"Repository '{owner}/{repo}' was not found.") from exc
        profile = self._store.get_profile(Repository(owner=connection.owner, repo=connection.repo, ref=connection.ref))
        if profile is None:
            raise NotFoundError(f"No project profile is available for '{owner}/{repo}'.")
        return profile

    def update_finding_status(self, finding_id: str, status: FindingStatus) -> Finding:
        finding = self._store.update_finding_status(finding_id, status)
        if finding is None:
            raise NotFoundError(f"Finding '{finding_id}' was not found.")
        return finding

    def create_issue(self, finding_id: str) -> IssueCreationResponse:
        with self._lock:
            finding = self._store.get_finding(finding_id)
            if finding is None:
                raise NotFoundError(f"Finding '{finding_id}' was not found.")
            if finding.issue.state is IssueState.CREATED:
                return IssueCreationResponse(finding_id=finding_id, issue=finding.issue)
            publisher = None
            try:
                publisher = self._publisher_factory()
                issue = publisher.publish(finding)
            except PublishingError as exc:
                failed_issue = FindingIssue(state=IssueState.FAILED, error=str(exc))
                self._store.update_finding_issue(finding_id, failed_issue)
                raise ExternalServiceError(str(exc)) from exc
            finally:
                if publisher is not None:
                    publisher.close()
            self._store.update_finding_issue(finding_id, issue)
            return IssueCreationResponse(finding_id=finding_id, issue=issue)


demo_service = DemoService()
