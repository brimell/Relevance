import os
import subprocess
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import quote

import httpx

from .models import ProjectProfile, Repository

MANIFEST_NAMES = {
    "readme.md", "readme.rst", "readme.txt", "pyproject.toml", "requirements.txt",
    "package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "cargo.toml",
    "go.mod", "pom.xml", "build.gradle", "dockerfile", "docker-compose.yml",
}
SOURCE_EXTENSIONS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".rs", ".go", ".java", ".kt", ".cpp",
    ".cc", ".c", ".h", ".hpp", ".cs", ".rb", ".php", ".swift", ".scala", ".sql",
}
IGNORED_PARTS = {".git", "node_modules", "vendor", "dist", "build", ".venv", "venv", "__pycache__", "coverage"}
MAX_CONTEXT_CHARS = 80_000
MAX_FILE_CHARS = 8_000
MAX_SOURCE_FILES = 16


class RepositoryIngestionError(Exception):
    pass


@dataclass(frozen=True)
class RepositorySnapshot:
    repository: Repository
    sha: str
    files: dict[str, str]
    context: str
    recent_commits: list[str]
    open_issues: list[str]

    def excerpt(self, path: str, limit: int = 1200) -> str:
        text = self.files.get(path, "")
        return text[:limit].strip()


class GitHubRepositoryClient:
    def __init__(self, token: str | None = None, transport: httpx.BaseTransport | None = None) -> None:
        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "Relevance-Hackathon/0.2",
        }
        if token:
            headers["Authorization"] = f"Bearer {token}"
        self.client = httpx.Client(base_url="https://api.github.com", timeout=30, headers=headers, transport=transport)

    def close(self) -> None:
        self.client.close()

    def _json(self, path: str, *, params: dict[str, Any] | None = None) -> Any:
        try:
            response = self.client.get(path, params=params)
            response.raise_for_status()
            return response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise RepositoryIngestionError("Could not read the selected repository from GitHub.") from exc

    def resolve_sha(self, repository: Repository) -> str:
        ref = quote(repository.ref or "HEAD", safe="")
        data = self._json(f"/repos/{repository.owner}/{repository.repo}/commits/{ref}")
        sha = data.get("sha") if isinstance(data, dict) else None
        if not isinstance(sha, str) or len(sha) < 7:
            raise RepositoryIngestionError("GitHub did not return a commit SHA for the selected ref.")
        return sha

    def tree_paths(self, repository: Repository, sha: str) -> list[str]:
        data = self._json(f"/repos/{repository.owner}/{repository.repo}/git/trees/{sha}", params={"recursive": "1"})
        tree = data.get("tree", []) if isinstance(data, dict) else []
        return [item["path"] for item in tree if isinstance(item, dict) and item.get("type") == "blob" and isinstance(item.get("path"), str)]

    def read_file(self, repository: Repository, sha: str, path: str) -> str:
        encoded = quote(path, safe="/")
        try:
            response = self.client.get(
                f"/repos/{repository.owner}/{repository.repo}/contents/{encoded}",
                params={"ref": sha},
                headers={"Accept": "application/vnd.github.raw+json"},
            )
            response.raise_for_status()
            return response.text[:MAX_FILE_CHARS]
        except httpx.HTTPError as exc:
            raise RepositoryIngestionError(f"Could not read {path} from GitHub.") from exc

    def recent_commits(self, repository: Repository, sha: str) -> list[str]:
        data = self._json(f"/repos/{repository.owner}/{repository.repo}/commits", params={"sha": sha, "per_page": 5})
        results: list[str] = []
        for item in data if isinstance(data, list) else []:
            message = item.get("commit", {}).get("message") if isinstance(item, dict) else None
            item_sha = item.get("sha") if isinstance(item, dict) else None
            if isinstance(message, str) and isinstance(item_sha, str):
                results.append(f"{item_sha[:8]} {message.splitlines()[0][:200]}")
        return results

    def open_issues(self, repository: Repository) -> list[str]:
        data = self._json(f"/repos/{repository.owner}/{repository.repo}/issues", params={"state": "open", "per_page": 10})
        return [f"#{item['number']} {item['title']}" for item in data if isinstance(item, dict) and "pull_request" not in item and isinstance(item.get("number"), int) and isinstance(item.get("title"), str)]


def _run_git(root: Path, *arguments: str) -> str:
    try:
        result = subprocess.run(
            ["git", "-C", str(root), *arguments], capture_output=True, text=True, check=True, timeout=20,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise RepositoryIngestionError("Could not read the selected local Git repository.") from exc
    return result.stdout


def _local_root(repository: Repository) -> Path | None:
    configured = os.getenv("RELEVANCE_REPOSITORY_ROOT")
    candidates = [Path(configured).expanduser()] if configured else [Path(__file__).resolve().parents[2]]
    for candidate in candidates:
        if (candidate / ".git").exists() and candidate.name.lower() == repository.repo.lower():
            return candidate
    return None


def _select_paths(paths: list[str]) -> list[str]:
    safe = [path for path in paths if path and not any(part in IGNORED_PARTS or part.startswith(".") for part in Path(path).parts)]
    manifests = sorted(path for path in safe if Path(path).name.lower() in MANIFEST_NAMES)[:10]
    sources = sorted(
        (path for path in safe if Path(path).suffix.lower() in SOURCE_EXTENSIONS),
        key=lambda path: (len(Path(path).parts), len(path), path),
    )[:MAX_SOURCE_FILES]
    return list(dict.fromkeys(manifests + sources))


def _build_context(files: dict[str, str], commits: list[str], issues: list[str]) -> str:
    sections: list[str] = []
    remaining = MAX_CONTEXT_CHARS
    for path, text in files.items():
        if remaining <= 0:
            break
        section = f"--- {path} ---\n{text[:remaining]}"
        sections.append(section)
        remaining -= len(section)
    if commits:
        sections.append("--- Recent commits ---\n" + "\n".join(commits))
    if issues:
        sections.append("--- Open issues ---\n" + "\n".join(issues))
    return "\n\n".join(sections)


def ingest_repository(repository: Repository, root: Path | None = None) -> RepositorySnapshot:
    root = root if root is not None and (root / ".git").exists() else _local_root(repository)
    if root is not None:
        sha = _run_git(root, "rev-parse", f"{repository.ref or 'HEAD'}^{{commit}}").strip()
        paths = _run_git(root, "ls-tree", "-r", "--name-only", sha).splitlines()
        selected = _select_paths(paths)
        files = {path: _run_git(root, "show", f"{sha}:{path}")[:MAX_FILE_CHARS] for path in selected}
        commits = [line for line in _run_git(root, "log", "-5", "--pretty=format:%h %s", sha).splitlines() if line]
        return RepositorySnapshot(repository, sha, files, _build_context(files, commits, []), commits, [])

    client = GitHubRepositoryClient(os.getenv("GITHUB_TOKEN") or None)
    try:
        sha = client.resolve_sha(repository)
        selected = _select_paths(client.tree_paths(repository, sha))
        files = {path: client.read_file(repository, sha, path) for path in selected}
        commits = client.recent_commits(repository, sha)
        issues = client.open_issues(repository)
        return RepositorySnapshot(repository, sha, files, _build_context(files, commits, issues), commits, issues)
    finally:
        client.close()


def build_project_profile(snapshot: RepositorySnapshot) -> ProjectProfile:
    readme = next((text for path, text in snapshot.files.items() if Path(path).name.lower().startswith("readme")), "")
    summary = " ".join(readme.replace("#", " ").split())[:800] or f"Repository {snapshot.repository.owner}/{snapshot.repository.repo}."
    manifests = [path for path in snapshot.files if Path(path).name.lower() in MANIFEST_NAMES]
    source_files = [path for path in snapshot.files if Path(path).suffix.lower() in SOURCE_EXTENSIONS]
    extensions = sorted({Path(path).suffix.lstrip(".") for path in source_files})
    topics = [f"{extension} software" for extension in extensions[:6]]
    dependency_terms: list[str] = []
    for path in manifests:
        if Path(path).name.lower().startswith("readme"):
            continue
        dependency_terms.extend(word.strip('"\' ,:=<>[]{}') for word in snapshot.files[path].split()[:80] if len(word) > 2)
    methods = list(dict.fromkeys(dependency_terms))[:12]
    return ProjectProfile(
        repository=snapshot.repository,
        analysed_sha=snapshot.sha,
        summary=summary,
        objectives=[summary[:300]],
        methods=methods,
        research_topics=topics or ["software engineering"],
        key_files=list(snapshot.files)[:20],
        assumptions=["Connections to research are model inferences and require verification."],
        generated_at=datetime.now(UTC),
    )
