from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.arxiv import ArxivError, ArxivPaper
from app.main import app
from app.service import demo_service

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_demo_service() -> None:
    demo_service.reset()
    demo_service._paper_provider = lambda: [
        ArxivPaper(
            identifier="arXiv:2601.00001v1",
            url="https://arxiv.org/abs/2601.00001v1",
            title="A live paper title",
            summary="A real abstract returned by the test provider.",
            authors=["Ada Lovelace", "Alan Turing"],
            published_at=datetime(2026, 1, 2, tzinfo=UTC),
        )
    ]


def start_scan(owner: str = "octo-org", repo: str = "demo-repo") -> dict:
    response = client.post(
        "/api/v1/scans",
        json={"repository": {"owner": owner, "repo": repo, "ref": "main"}},
    )
    assert response.status_code == 202
    return response.json()


def complete_scan(scan_id: str) -> None:
    running = client.get(f"/api/v1/scans/{scan_id}")
    assert running.status_code == 200
    assert running.json()["status"] == "running"

    completed = client.get(f"/api/v1/scans/{scan_id}")
    assert completed.status_code == 200
    assert completed.json()["status"] == "completed"
    assert completed.json()["progress"]["percent"] == 100


def test_health_and_generated_docs_identify_simulation() -> None:
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["simulated"] is True

    assert client.get("/docs").status_code == 200
    openapi = client.get("/openapi.json")
    assert openapi.status_code == 200
    assert openapi.json()["info"]["title"] == "Relevance Bot API"
    schema = openapi.json()
    assert "fetches recent paper metadata from arXiv" in schema["info"]["description"]
    error_schema = {"$ref": "#/components/schemas/ErrorResponse"}
    assert (
        schema["paths"]["/api/v1/scans/{scan_id}"]["get"]["responses"]["404"][
            "content"
        ]["application/json"]["schema"]
        == error_schema
    )
    issue_responses = schema["paths"]["/api/v1/findings/{finding_id}/issues"]["post"][
        "responses"
    ]
    assert (
        issue_responses["404"]["content"]["application/json"]["schema"] == error_schema
    )
    assert (
        issue_responses["409"]["content"]["application/json"]["schema"] == error_schema
    )


def test_scan_lifecycle_and_findings() -> None:
    scan = start_scan()
    assert scan["status"] == "queued"
    assert scan["repository"] == {
        "owner": "octo-org",
        "repo": "demo-repo",
        "ref": "main",
    }
    assert scan["simulated"] is True

    unavailable = client.get(f"/api/v1/scans/{scan['id']}/findings")
    assert unavailable.status_code == 409

    complete_scan(scan["id"])
    response = client.get(f"/api/v1/scans/{scan['id']}/findings")
    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 1
    assert body["scan_id"] == scan["id"]
    finding = body["findings"][0]
    assert finding["source"]["type"] == "paper"
    assert finding["source"]["identifier"] == "arXiv:2601.00001v1"
    assert finding["source"]["authors"] == ["Ada Lovelace", "Alan Turing"]
    assert finding["severity"] == "info"
    assert finding["issue"]["state"] == "not_created"


def test_arxiv_failure_marks_scan_failed() -> None:
    def fail() -> list[ArxivPaper]:
        raise ArxivError("The arXiv request timed out.")

    demo_service._paper_provider = fail
    scan = start_scan()
    assert client.get(f"/api/v1/scans/{scan['id']}").json()["status"] == "running"

    failed = client.get(f"/api/v1/scans/{scan['id']}")
    assert failed.status_code == 200
    assert failed.json()["status"] == "failed"
    assert failed.json()["error"] == "The arXiv request timed out."

    findings = client.get(f"/api/v1/scans/{scan['id']}/findings")
    assert findings.status_code == 409


def test_active_duplicate_scan_returns_conflict() -> None:
    start_scan()
    response = client.post(
        "/api/v1/scans",
        json={"repository": {"owner": "octo-org", "repo": "demo-repo"}},
    )
    assert response.status_code == 409
    assert "already active" in response.json()["detail"]


def test_repository_history_and_simulated_issue_creation() -> None:
    scan = start_scan()
    complete_scan(scan["id"])

    history = client.get("/api/v1/repositories/octo-org/demo-repo/findings")
    assert history.status_code == 200
    assert history.json()["count"] == 1
    finding_id = history.json()["findings"][0]["id"]

    rejected = client.post(
        f"/api/v1/findings/{finding_id}/issues",
        json={"approved": False},
    )
    assert rejected.status_code == 422

    created = client.post(
        f"/api/v1/findings/{finding_id}/issues",
        json={"approved": True},
    )
    assert created.status_code == 201
    assert created.json()["state"] == "created"
    assert created.json()["simulated"] is True
    assert created.json()["url"].startswith("https://example.invalid/")

    duplicate = client.post(
        f"/api/v1/findings/{finding_id}/issues",
        json={"approved": True},
    )
    assert duplicate.status_code == 409

    updated_history = client.get("/api/v1/repositories/octo-org/demo-repo/findings")
    updated = next(
        item for item in updated_history.json()["findings"] if item["id"] == finding_id
    )
    assert updated["issue"]["state"] == "created"


def test_unknown_resources_and_empty_repository_history() -> None:
    assert client.get("/api/v1/scans/missing").status_code == 404
    assert client.get("/api/v1/scans/missing/findings").status_code == 404
    assert (
        client.post(
            "/api/v1/findings/missing/issues",
            json={"approved": True},
        ).status_code
        == 404
    )

    history = client.get("/api/v1/repositories/valid-owner/unknown/findings")
    assert history.status_code == 200
    assert history.json()["findings"] == []


def test_request_validation_rejects_bad_repository_and_extra_fields() -> None:
    bad_owner = client.post(
        "/api/v1/scans",
        json={"repository": {"owner": "bad owner", "repo": "demo"}},
    )
    assert bad_owner.status_code == 422

    dot_git = client.post(
        "/api/v1/scans",
        json={"repository": {"owner": "owner", "repo": "demo.git"}},
    )
    assert dot_git.status_code == 422

    dot_git_path = client.get("/api/v1/repositories/owner/demo.git/findings")
    assert dot_git_path.status_code == 422

    extra = client.post(
        "/api/v1/scans",
        json={"repository": {"owner": "owner", "repo": "demo"}, "live": True},
    )
    assert extra.status_code == 422
