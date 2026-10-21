from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.arxiv import ArxivError, ArxivPaper
from app.main import create_app
from app.models import FindingIssue, IssueState, Repository
from app.repository import RepositorySnapshot
from app.service import DemoService
from app.storage import SQLiteStore


def paper() -> ArxivPaper:
    return ArxivPaper(
        identifier="arXiv:2601.00001v1",
        url="https://arxiv.org/abs/2601.00001v1",
        title="A repository-aware paper",
        summary="The abstract reports a technique; it does not claim results for this repository.",
        authors=["Ada Lovelace", "Alan Turing"],
        published_at=datetime(2026, 1, 2, tzinfo=UTC),
    )


def repository_provider(repository: Repository) -> RepositorySnapshot:
    files = {
        "README.md": "# Demo\nA retrieval service for developer research.",
        "src/retrieval.py": "def retrieve(query):\n    return vector_search(query)\n",
        "requirements.txt": "fastapi\n",
    }
    context = "\n\n".join(f"--- {path} ---\n{text}" for path, text in files.items())
    return RepositorySnapshot(repository, "a" * 40, files, context, ["aaaa initial"], [])


def evaluator(papers, snapshot, profile, max_findings):
    del snapshot, profile, max_findings
    return [{
        "paperId": papers[0].identifier,
        "findingType": "potential_improvement",
        "whyRelevant": "The retrieval function uses vector search, which is the exact mechanism discussed by this paper.",
        "affectedFiles": ["src/retrieval.py"],
        "suggestedAction": "Benchmark the current retrieval function against the paper's method on a fixed query set.",
        "confidence": 0.88,
    }]


class FakePublisher:
    calls = 0

    def publish(self, finding):
        type(self).calls += 1
        return FindingIssue(
            state=IssueState.CREATED,
            number=42,
            url=f"https://github.com/{finding.repository.owner}/{finding.repository.repo}/issues/42",
            created_at=datetime(2026, 1, 3, tzinfo=UTC),
        )

    def close(self):
        pass


@pytest.fixture
def service() -> DemoService:
    FakePublisher.calls = 0
    return DemoService(
        paper_provider=lambda: [paper()],
        store=SQLiteStore(":memory:"),
        repository_provider=repository_provider,
        evaluator=evaluator,
        publisher_factory=FakePublisher,
    )


@pytest.fixture
def client(service: DemoService) -> TestClient:
    return TestClient(create_app(service))


def start_scan(client: TestClient) -> dict:
    response = client.post(
        "/api/v1/scans",
        json={"repository": {"owner": "octo-org", "repo": "demo-repo", "ref": "main"}},
    )
    assert response.status_code == 202
    return response.json()


def complete_scan(client: TestClient, scan_id: str) -> dict:
    running = client.get(f"/api/v1/scans/{scan_id}")
    assert running.json()["status"] == "running"
    completed = client.get(f"/api/v1/scans/{scan_id}")
    assert completed.json()["status"] == "completed"
    return completed.json()


def test_health_and_repository_connection(client: TestClient) -> None:
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["service"] == "relevance-bot-api"
    assert "simulation" not in health.json()

    created = client.post(
        "/api/v1/repositories",
        json={"repository": {"owner": "octo-org", "repo": "demo-repo", "ref": "main"}},
    )
    assert created.status_code == 201
    assert created.json()["repo"] == "demo-repo"
    repositories = client.get("/api/v1/repositories").json()
    assert repositories["count"] == 1


def test_scan_produces_grounded_shared_finding_and_profile(client: TestClient) -> None:
    scan = start_scan(client)
    unavailable = client.get(f"/api/v1/scans/{scan['id']}/findings")
    assert unavailable.status_code == 409

    completed = complete_scan(client, scan["id"])
    assert completed["analysed_sha"] == "a" * 40
    response = client.get(f"/api/v1/scans/{scan['id']}/findings")
    assert response.status_code == 200
    finding = response.json()["findings"][0]
    assert finding["finding_type"] == "potential_improvement"
    assert finding["evidence_label"] == "strong_match"
    assert finding["affected_files"][0]["path"] == "src/retrieval.py"
    assert "vector_search" in finding["affected_files"][0]["excerpt"]
    assert finding["summary"].startswith("The abstract reports")
    assert "retrieval function" in finding["why_relevant"]

    history = client.get("/api/v1/repositories/octo-org/demo-repo/findings").json()
    assert history["findings"][0]["id"] == finding["id"]
    profile = client.get("/api/v1/repositories/octo-org/demo-repo/profile")
    assert profile.status_code == 200
    assert profile.json()["analysed_sha"] == "a" * 40
    assert "src/retrieval.py" in profile.json()["key_files"]


def test_status_and_issue_publication_are_persisted_and_idempotent(client: TestClient) -> None:
    scan = start_scan(client)
    complete_scan(client, scan["id"])
    finding_id = client.get(f"/api/v1/scans/{scan['id']}/findings").json()["findings"][0]["id"]

    saved = client.patch(f"/api/v1/findings/{finding_id}", json={"status": "saved"})
    assert saved.status_code == 200
    assert saved.json()["user_status"] == "saved"

    created = client.post(f"/api/v1/findings/{finding_id}/issues", json={"approved": True})
    assert created.status_code == 200
    assert created.json()["issue"]["url"].endswith("/issues/42")
    duplicate = client.post(f"/api/v1/findings/{finding_id}/issues", json={"approved": True})
    assert duplicate.status_code == 200
    assert duplicate.json() == created.json()
    assert FakePublisher.calls == 1

    history = client.get("/api/v1/repositories/octo-org/demo-repo/findings").json()["findings"][0]
    assert history["user_status"] == "saved"
    assert history["issue"]["number"] == 42


def test_shared_sqlite_survives_service_recreation(tmp_path) -> None:
    path = tmp_path / "relevance.db"
    first = DemoService(
        paper_provider=lambda: [paper()], store=SQLiteStore(path), repository_provider=repository_provider, evaluator=evaluator,
    )
    scan = first.start_scan(Repository(owner="octo-org", repo="demo-repo", ref="main"))
    first.get_scan(scan.id)
    first.get_scan(scan.id)
    finding_id = first.get_scan_findings(scan.id).findings[0].id

    second = DemoService(store=SQLiteStore(path))
    history = second.get_repository_findings("octo-org", "demo-repo")
    assert history.findings[0].id == finding_id
    assert second.get_scan(scan.id, advance=False).analysed_sha == "a" * 40


def test_arxiv_failure_marks_scan_failed(service: DemoService, client: TestClient) -> None:
    def fail():
        raise ArxivError("The arXiv request timed out.")

    service._paper_provider = fail
    scan = start_scan(client)
    client.get(f"/api/v1/scans/{scan['id']}")
    failed = client.get(f"/api/v1/scans/{scan['id']}")
    assert failed.json()["status"] == "failed"
    assert failed.json()["error"] == "The arXiv request timed out."


def test_validation_unknown_resources_and_duplicate_scan(client: TestClient) -> None:
    start_scan(client)
    duplicate = client.post(
        "/api/v1/scans", json={"repository": {"owner": "octo-org", "repo": "demo-repo"}},
    )
    assert duplicate.status_code == 409
    assert client.get("/api/v1/scans/missing").status_code == 404
    assert client.patch("/api/v1/findings/missing", json={"status": "saved"}).status_code == 404
    assert client.post("/api/v1/findings/missing/issues", json={"approved": True}).status_code == 404
    assert client.post("/api/v1/scans", json={"repository": {"owner": "bad owner", "repo": "demo"}}).status_code == 422
    assert client.post("/api/v1/scans", json={"repository": {"owner": "owner", "repo": "demo.git"}}).status_code == 422
