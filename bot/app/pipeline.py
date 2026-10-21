import os
from collections.abc import Callable
from datetime import UTC, datetime
from uuid import NAMESPACE_URL, uuid5

from .arxiv import ArxivPaper, PaperProvider, fetch_recent_papers
from .evaluation import evaluate_with_nebius, presentation_for_confidence, shortlist_papers
from .models import FileEvidence, Finding, FindingSource, FindingSourceType, FindingType, ProjectProfile, Scan
from .repository import RepositorySnapshot, build_project_profile, ingest_repository
from .storage import SQLiteStore, repository_key

RepositoryProvider = Callable[[object], RepositorySnapshot]
Evaluator = Callable[[list[ArxivPaper], RepositorySnapshot, ProjectProfile, int], list[dict]]


class ResearchPipeline:
    """Canonical ingestion and evaluation pipeline used by API and scheduled scans."""

    def __init__(
        self,
        store: SQLiteStore,
        paper_provider: PaperProvider = fetch_recent_papers,
        repository_provider: Callable = ingest_repository,
        evaluator: Evaluator = evaluate_with_nebius,
        max_findings: int = 5,
    ) -> None:
        self.store = store
        self.paper_provider = paper_provider
        self.repository_provider = repository_provider
        self.evaluator = evaluator
        self.max_findings = max_findings

    def run(self, scan: Scan) -> tuple[RepositorySnapshot, ProjectProfile, list[Finding]]:
        snapshot = self.repository_provider(scan.repository)
        self.store.upsert_repository(
            scan.repository,
            analysed_sha=snapshot.sha,
            github_connected=bool(os.getenv("GITHUB_TOKEN")),
        )
        profile = build_project_profile(snapshot)
        self.store.save_profile(profile)

        papers = self.paper_provider()
        shortlisted = shortlist_papers(papers, profile)
        for paper in shortlisted:
            self.store.save_paper(paper)
        evaluations = self.evaluator(shortlisted, snapshot, profile, self.max_findings)
        papers_by_id = {paper.identifier: paper for paper in shortlisted}
        detected_at = datetime.now(UTC)
        findings: list[Finding] = []
        for result in evaluations:
            paper = papers_by_id.get(result["paperId"])
            if paper is None:
                continue
            evidence_label, relevance, severity = presentation_for_confidence(float(result["confidence"]))
            finding_id = str(uuid5(NAMESPACE_URL, f"relevance:finding:{repository_key(scan.repository)}:{snapshot.sha}:{paper.identifier}"))
            finding = Finding(
                id=finding_id,
                scan_id=scan.id,
                repository=scan.repository,
                analysed_sha=snapshot.sha,
                source=FindingSource(
                    type=FindingSourceType.PAPER,
                    identifier=paper.identifier,
                    url=paper.url,
                    published_at=paper.published_at,
                    authors=paper.authors,
                ),
                finding_type=FindingType(result["findingType"]),
                severity=severity,
                relevance=relevance,
                evidence_label=evidence_label,
                title=paper.title[:240],
                summary=paper.summary[:4000],
                why_relevant=result["whyRelevant"].strip()[:3000],
                affected_files=[
                    FileEvidence(path=path, excerpt=snapshot.excerpt(path) or "File was present at the analysed commit.")
                    for path in result["affectedFiles"]
                ],
                suggested_action=result["suggestedAction"].strip()[:2000],
                detected_at=detected_at,
            )
            self.store.save_finding(finding)
            findings.append(self.store.get_finding(finding.id) or finding)
        self.store.mark_processed(scan.repository, [paper.identifier for paper in shortlisted])
        return snapshot, profile, findings
