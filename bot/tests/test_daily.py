import subprocess
from datetime import UTC, datetime

from app.arxiv import ArxivPaper
from app.daily import load_config
from app.evaluation import shortlist_papers, validate_evaluation
from app.models import ProjectProfile, Repository
from app.repository import RepositorySnapshot, ingest_repository


def paper(identifier: str = "arXiv:2601.00001v1", title: str = "Vector retrieval") -> ArxivPaper:
    return ArxivPaper(
        identifier=identifier,
        url=f"https://arxiv.org/abs/{identifier.removeprefix('arXiv:')}",
        title=title,
        summary="A technique for vector retrieval in software systems.",
        authors=["Researcher"],
        published_at=datetime(2026, 1, 2, tzinfo=UTC),
    )


def snapshot() -> RepositorySnapshot:
    repository = Repository(owner="owner", repo="repo", ref="main")
    files = {"src/retrieval.py": "def retrieve(query):\n    return search(query)\n"}
    return RepositorySnapshot(repository, "abc1234", files, "--- src/retrieval.py ---\n" + files["src/retrieval.py"], [], [])


def test_config_and_grounded_result_validation(tmp_path) -> None:
    config_path = tmp_path / "relevance.yml"
    config_path.write_text("arxiv:\n  categories: [cs.SE]\n  max_papers_per_scan: 4\nmax_findings_per_digest: 2\n")
    assert load_config(config_path) == {"categories": ["cs.SE"], "max_papers": 4, "max_findings": 2}

    result = {
        "findings": [
            {
                "paperId": "arXiv:2601.00001v1",
                "findingType": "potential_improvement",
                "whyRelevant": "The repository retrieval function uses the same mechanism discussed in the abstract.",
                "affectedFiles": ["src/retrieval.py", "invented.py"],
                "suggestedAction": "Benchmark both methods on a fixed test set.",
                "confidence": 0.8,
            },
            {
                "paperId": "arXiv:made-up",
                "findingType": "new_technique",
                "whyRelevant": "This identifier was not supplied and must be rejected from the result.",
                "affectedFiles": ["src/retrieval.py"],
                "suggestedAction": "Do not run this invalid experiment.",
                "confidence": 1.0,
            },
        ]
    }
    findings = validate_evaluation(result, [paper()], snapshot(), 3)
    assert len(findings) == 1
    assert findings[0]["affectedFiles"] == ["src/retrieval.py"]


def test_shortlist_uses_project_profile_terms() -> None:
    snap = snapshot()
    profile = ProjectProfile(
        repository=snap.repository,
        analysed_sha=snap.sha,
        summary="Vector retrieval service",
        research_topics=["retrieval"],
        key_files=list(snap.files),
        generated_at=datetime.now(UTC),
    )
    unrelated = paper("arXiv:2601.00002v1", "Quantum materials")
    shortlisted = shortlist_papers([unrelated, paper()], profile, limit=1)
    assert shortlisted[0].identifier == "arXiv:2601.00001v1"


def test_local_ingestion_reads_nested_source_at_exact_commit(tmp_path) -> None:
    root = tmp_path / "repo"
    root.mkdir()
    (root / "src").mkdir()
    (root / "README.md").write_text("# Repository\nA retrieval demo.")
    (root / "src" / "retrieval.py").write_text("def retrieve():\n    return 'committed'\n")
    subprocess.run(["git", "init", "-q", str(root)], check=True)
    subprocess.run(["git", "-C", str(root), "config", "user.email", "test@example.com"], check=True)
    subprocess.run(["git", "-C", str(root), "config", "user.name", "Test"], check=True)
    subprocess.run(["git", "-C", str(root), "add", "README.md", "src/retrieval.py"], check=True)
    subprocess.run(["git", "-C", str(root), "commit", "-qm", "initial"], check=True)
    expected_sha = subprocess.run(
        ["git", "-C", str(root), "rev-parse", "HEAD"], capture_output=True, text=True, check=True
    ).stdout.strip()
    (root / "src" / "retrieval.py").write_text("def retrieve():\n    return 'uncommitted'\n")

    ingested = ingest_repository(Repository(owner="owner", repo="repo", ref="HEAD"), root)
    assert ingested.sha == expected_sha
    assert "src/retrieval.py" in ingested.files
    assert "committed" in ingested.files["src/retrieval.py"]
    assert "uncommitted" not in ingested.files["src/retrieval.py"]
