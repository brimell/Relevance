import os
from datetime import UTC, datetime
from typing import Any

import httpx

from .models import Finding, FindingIssue, IssueState


class PublishingError(Exception):
    pass


class GitHubIssuePublisher:
    def __init__(self, token: str | None = None, transport: httpx.BaseTransport | None = None) -> None:
        selected_token = token or os.getenv("GITHUB_TOKEN", "").strip()
        if not selected_token:
            raise PublishingError("GITHUB_TOKEN is required to publish findings.")
        self.client = httpx.Client(
            base_url="https://api.github.com",
            timeout=30,
            transport=transport,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {selected_token}",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "Relevance-Hackathon/0.2",
            },
        )

    def close(self) -> None:
        self.client.close()

    @staticmethod
    def marker(finding: Finding) -> str:
        return f"<!-- relevance-finding:{finding.id} -->"

    def _request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        try:
            response = self.client.request(method, path, **kwargs)
            response.raise_for_status()
            return response
        except httpx.HTTPError as exc:
            raise PublishingError("GitHub issue publication failed.") from exc

    def find_existing(self, finding: Finding) -> dict[str, Any] | None:
        response = self._request(
            "GET",
            f"/repos/{finding.repository.owner}/{finding.repository.repo}/issues",
            params={"state": "all", "per_page": 100},
        )
        marker = self.marker(finding)
        return next((issue for issue in response.json() if marker in (issue.get("body") or "")), None)

    def publish(self, finding: Finding) -> FindingIssue:
        existing = self.find_existing(finding)
        issue = existing or self._request(
            "POST",
            f"/repos/{finding.repository.owner}/{finding.repository.repo}/issues",
            json={"title": f"[Relevance] {finding.title}"[:256], "body": render_finding_issue(finding)},
        ).json()
        try:
            return FindingIssue(
                state=IssueState.CREATED,
                number=int(issue["number"]),
                url=issue["html_url"],
                created_at=datetime.fromisoformat(issue["created_at"].replace("Z", "+00:00")) if issue.get("created_at") else datetime.now(UTC),
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise PublishingError("GitHub returned an invalid issue response.") from exc


def render_finding_issue(finding: Finding) -> str:
    files = "\n".join(f"- `{evidence.path}`" for evidence in finding.affected_files)
    excerpts = "\n\n".join(f"### `{evidence.path}`\n```text\n{evidence.excerpt}\n```" for evidence in finding.affected_files)
    return f"""{GitHubIssuePublisher.marker(finding)}
## Paper

[{finding.title}]({finding.source.url}) ({finding.source.identifier})

### What the paper reports

{finding.summary}

## Possible application to this repository

{finding.why_relevant}

Analysed commit: `{finding.analysed_sha}`

### Affected files

{files}

{excerpts}

## Suggested experiment

{finding.suggested_action}

> This connection is a model inference labelled **{finding.evidence_label.value.replace('_', ' ')}**. Relevance evaluated the supplied abstract and repository snapshot; it did not validate the paper's results.
"""
