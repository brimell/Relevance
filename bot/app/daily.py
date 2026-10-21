import os
from pathlib import Path
from typing import Any

import yaml

from .arxiv import fetch_recent_papers
from .models import Repository, ScanStatus
from .repository import ingest_repository
from .service import DemoService, ExternalServiceError
from .storage import SQLiteStore


class DailyScanError(Exception):
    pass


def required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise DailyScanError(f"{name} is required.")
    return value


def load_config(path: Path) -> dict[str, Any]:
    try:
        loaded = yaml.safe_load(path.read_text()) or {}
    except (OSError, yaml.YAMLError) as exc:
        raise DailyScanError(f"Could not read {path}.") from exc
    arxiv = loaded.get("arxiv", {})
    categories = arxiv.get("categories", [])
    if not isinstance(categories, list) or not categories or not all(isinstance(item, str) and item.strip() for item in categories):
        raise DailyScanError("arxiv.categories must be a non-empty list of strings.")
    max_papers = arxiv.get("max_papers_per_scan", 10)
    if not isinstance(max_papers, int) or not 1 <= max_papers <= 25:
        raise DailyScanError("arxiv.max_papers_per_scan must be between 1 and 25.")
    return {
        "categories": list(dict.fromkeys(item.strip() for item in categories)),
        "max_papers": max_papers,
        "max_findings": min(max(int(loaded.get("max_findings_per_digest", 3)), 1), 5),
    }


def run(root: Path = Path(".")) -> None:
    repository_name = required_env("GITHUB_REPOSITORY")
    try:
        owner, repo = repository_name.split("/", 1)
    except ValueError as exc:
        raise DailyScanError("GITHUB_REPOSITORY must use owner/repository format.") from exc
    config = load_config(root / ".github" / "relevance.yml")
    repository = Repository(owner=owner, repo=repo, ref=os.getenv("GITHUB_SHA") or None)
    store = SQLiteStore(os.getenv("RELEVANCE_DB_PATH") or root / "bot" / "relevance.db")
    service = DemoService(
        paper_provider=lambda: fetch_recent_papers(categories=tuple(config["categories"]), max_results=config["max_papers"]),
        store=store,
        repository_provider=lambda selected: ingest_repository(selected, root),
        max_findings=config["max_findings"],
    )
    scan = service.start_scan(repository)
    service.get_scan(scan.id)
    completed = service.get_scan(scan.id)
    if completed.status is ScanStatus.FAILED:
        raise DailyScanError(completed.error or "The scheduled scan failed.")
    response = service.get_scan_findings(scan.id)
    if not response.findings:
        print("No sufficiently grounded findings were returned.")
        return
    published = 0
    for finding in response.findings:
        try:
            result = service.create_issue(finding.id)
        except ExternalServiceError as exc:
            raise DailyScanError(str(exc)) from exc
        print(f"Published finding {finding.id}: {result.issue.url}")
        published += 1
    print(f"Completed scan {scan.id} at {completed.analysed_sha}; published {published} finding(s).")


if __name__ == "__main__":
    try:
        run(Path(os.getenv("GITHUB_WORKSPACE", ".")))
    except DailyScanError as exc:
        raise SystemExit(str(exc)) from exc
