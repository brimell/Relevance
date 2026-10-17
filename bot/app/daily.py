import json
import os
import re
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
import yaml

from .arxiv import ArxivPaper, fetch_recent_papers

STATE_TITLE = "[Relevance] Bot state (do not close)"
STATE_MARKER = "relevance-state"
DEFAULT_NEBIUS_URL = "https://api.tokenfactory.nebius.com/v1"
CONTEXT_FILES = (
    "README.md",
    "README.rst",
    "pyproject.toml",
    "requirements.txt",
    "package.json",
    "Cargo.toml",
    "go.mod",
)


class DailyScanError(Exception):
    pass


class GitHubClient:
    def __init__(self, token: str, repository: str) -> None:
        self.repository = repository
        self.client = httpx.Client(
            base_url="https://api.github.com",
            timeout=20,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {token}",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "Relevance-Hackathon/0.1",
            },
        )

    def close(self) -> None:
        self.client.close()

    def find_state_issue(self) -> dict[str, Any] | None:
        response = self.client.get(
            f"/repos/{self.repository}/issues",
            params={"state": "all", "per_page": 100},
        )
        self._raise(response, "read GitHub issues")
        return next(
            (issue for issue in response.json() if issue.get("title") == STATE_TITLE),
            None,
        )

    def create_issue(self, title: str, body: str) -> dict[str, Any]:
        response = self.client.post(
            f"/repos/{self.repository}/issues",
            json={"title": title, "body": body},
        )
        self._raise(response, "create a GitHub issue")
        return response.json()

    def update_issue(self, issue_number: int, body: str) -> None:
        response = self.client.patch(
            f"/repos/{self.repository}/issues/{issue_number}",
            json={"body": body, "state": "open"},
        )
        self._raise(response, "update the Relevance state issue")

    @staticmethod
    def _raise(response: httpx.Response, action: str) -> None:
        try:
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise DailyScanError(f"Could not {action}.") from exc


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
    if not isinstance(categories, list) or not all(
        isinstance(item, str) and item.strip() for item in categories
    ):
        raise DailyScanError("arxiv.categories must be a non-empty list of strings.")
    if not categories:
        raise DailyScanError("Configure at least one arXiv category.")
    max_papers = arxiv.get("max_papers_per_scan", 10)
    if not isinstance(max_papers, int) or not 1 <= max_papers <= 25:
        raise DailyScanError("arxiv.max_papers_per_scan must be between 1 and 25.")
    return {
        "categories": list(dict.fromkeys(item.strip() for item in categories)),
        "max_papers": max_papers,
        "max_findings": min(max(loaded.get("max_findings_per_digest", 3), 1), 5),
    }


def parse_state(body: str | None) -> dict[str, Any]:
    if not body:
        return {"processedPaperIds": [], "inferredCategories": []}
    match = re.search(
        rf"<!-- {STATE_MARKER}\s*(.*?)\s*-->", body, flags=re.DOTALL
    )
    if not match:
        return {"processedPaperIds": [], "inferredCategories": []}
    try:
        state = json.loads(match.group(1))
    except json.JSONDecodeError as exc:
        raise DailyScanError("The Relevance state issue contains invalid JSON.") from exc
    state.setdefault("processedPaperIds", [])
    state.setdefault("inferredCategories", [])
    return state


def render_state(state: dict[str, Any]) -> str:
    payload = json.dumps(state, indent=2, sort_keys=True)
    return (
        "This issue stores state for the Relevance demo bot. Do not edit or close it.\n\n"
        f"<!-- {STATE_MARKER}\n{payload}\n-->"
    )


def collect_repository_context(root: Path, limit: int = 20_000) -> str:
    sections: list[str] = []
    remaining = limit
    for name in CONTEXT_FILES:
        path = root / name
        if not path.is_file() or remaining <= 0:
            continue
        text = path.read_text(errors="replace")[:remaining]
        sections.append(f"--- {name} ---\n{text}")
        remaining -= len(text)
    return "\n\n".join(sections) or "No standard repository context files were found."


def call_nebius(
    papers: list[ArxivPaper],
    repository: str,
    repository_context: str,
    categories: list[str],
    max_findings: int,
) -> dict[str, Any]:
    api_key = required_env("NEBIUS_API_KEY")
    model = required_env("NEBIUS_MODEL")
    base_url = os.getenv("NEBIUS_BASE_URL", DEFAULT_NEBIUS_URL).rstrip("/")
    paper_data = [asdict(paper) for paper in papers]
    for paper in paper_data:
        paper["published_at"] = paper["published_at"].isoformat()

    prompt = f"""Evaluate the supplied new arXiv papers against this GitHub repository.
Return at most {max_findings} concrete findings. Return no finding when evidence is weak.
Do not claim that an improvement is proven. Cite only file names visible in the repository context.
Also suggest zero to three arXiv categories that should be monitored as the repository evolves.

Repository: {repository}
Current categories: {json.dumps(categories)}

Repository context:
{repository_context}

New papers:
{json.dumps(paper_data)}

Return JSON only with this shape:
{{
  "findings": [{{
    "paperId": "arXiv identifier from the input",
    "title": "short issue section title",
    "whyRelevant": "grounded explanation",
    "affectedFiles": ["path"],
    "suggestedAction": "specific investigation",
    "confidence": 0.0
  }}],
  "inferredCategories": ["cs.AI"]
}}
"""
    try:
        response = httpx.post(
            f"{base_url}/chat/completions",
            timeout=60,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a cautious research reviewer for software developers.",
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.1,
                "response_format": {"type": "json_object"},
            },
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        result = json.loads(content)
    except (httpx.HTTPError, KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise DailyScanError("Nebius evaluation failed or returned invalid JSON.") from exc
    if not isinstance(result.get("findings"), list) or not isinstance(
        result.get("inferredCategories", []), list
    ):
        raise DailyScanError("Nebius returned an invalid result shape.")
    return result


def validate_result(
    result: dict[str, Any], papers: list[ArxivPaper], max_findings: int
) -> tuple[list[dict[str, Any]], list[str]]:
    paper_ids = {paper.identifier for paper in papers}
    findings: list[dict[str, Any]] = []
    required = {"paperId", "title", "whyRelevant", "affectedFiles", "suggestedAction"}
    for finding in result["findings"]:
        if not isinstance(finding, dict) or not required <= finding.keys():
            continue
        if finding["paperId"] not in paper_ids:
            continue
        confidence = finding.get("confidence", 0)
        if not isinstance(confidence, (int, float)) or confidence < 0.7:
            continue
        findings.append(finding)
        if len(findings) == max_findings:
            break
    inferred = [
        item
        for item in result.get("inferredCategories", [])
        if isinstance(item, str) and re.fullmatch(r"[a-z-]+(?:\.[A-Z-]+)?", item)
    ][:3]
    return findings, list(dict.fromkeys(inferred))


def render_digest(findings: list[dict[str, Any]], papers: list[ArxivPaper]) -> str:
    by_id = {paper.identifier: paper for paper in papers}
    sections = ["New research that may be relevant to this repository:\n"]
    for finding in findings:
        paper = by_id[finding["paperId"]]
        files = finding["affectedFiles"] if isinstance(finding["affectedFiles"], list) else []
        file_lines = "\n".join(f"- `{item}`" for item in files) or "- No specific file identified"
        sections.append(
            f"## {finding['title']}\n\n"
            f"**Paper:** [{paper.title}]({paper.url})\n\n"
            f"**Why it may matter:** {finding['whyRelevant']}\n\n"
            f"**Relevant files:**\n{file_lines}\n\n"
            f"**Suggested investigation:** {finding['suggestedAction']}\n\n"
            f"**Confidence:** {float(finding['confidence']):.0%}"
        )
    sections.append("_Generated by the Relevance hackathon bot. Recommendations require developer review._")
    return "\n\n".join(sections)


def run(root: Path = Path(".")) -> None:
    repository = required_env("GITHUB_REPOSITORY")
    github = GitHubClient(required_env("GITHUB_TOKEN"), repository)
    try:
        config = load_config(root / ".github" / "relevance.yml")
        state_issue = github.find_state_issue()
        state = parse_state(state_issue.get("body") if state_issue else None)
        categories = list(
            dict.fromkeys(config["categories"] + state["inferredCategories"])
        )
        papers = fetch_recent_papers(
            categories=tuple(categories), max_results=config["max_papers"]
        )
        processed = set(state["processedPaperIds"])
        new_papers = [paper for paper in papers if paper.identifier not in processed]
        if not new_papers:
            print("No new arXiv papers to evaluate.")
            return

        result = call_nebius(
            new_papers,
            repository,
            collect_repository_context(root),
            categories,
            config["max_findings"],
        )
        findings, inferred = validate_result(
            result, new_papers, config["max_findings"]
        )
        if findings:
            date = datetime.now(UTC).date().isoformat()
            issue = github.create_issue(
                f"[Relevance] Research digest — {date}",
                render_digest(findings, new_papers),
            )
            print(f"Created digest issue {issue['html_url']}")
        else:
            print("No sufficiently grounded findings were returned.")

        state["processedPaperIds"] = (
            state["processedPaperIds"]
            + [paper.identifier for paper in new_papers]
        )[-500:]
        state["inferredCategories"] = inferred
        state["lastSuccessfulScan"] = datetime.now(UTC).isoformat()
        body = render_state(state)
        if state_issue:
            github.update_issue(state_issue["number"], body)
        else:
            github.create_issue(STATE_TITLE, body)
    finally:
        github.close()


if __name__ == "__main__":
    try:
        run(Path(os.getenv("GITHUB_WORKSPACE", ".")))
    except DailyScanError as exc:
        raise SystemExit(str(exc)) from exc
