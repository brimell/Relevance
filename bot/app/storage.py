import json
import os
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from threading import RLock

from .arxiv import ArxivPaper
from .models import (
    Finding,
    FindingIssue,
    FindingStatus,
    ProjectProfile,
    Repository,
    RepositoryConnection,
    Scan,
)


def utc_now() -> datetime:
    return datetime.now(UTC)


def repository_key(repository: Repository) -> str:
    return f"{repository.owner.lower()}/{repository.repo.lower()}"


def default_database_path() -> Path:
    configured = os.getenv("RELEVANCE_DB_PATH")
    if configured:
        return Path(configured).expanduser()
    return Path(__file__).resolve().parents[1] / "relevance.db"


class SQLiteStore:
    """Small durable store shared by API scans and scheduled scans."""

    def __init__(self, path: str | Path | None = None) -> None:
        selected = str(path or default_database_path())
        if selected != ":memory:":
            Path(selected).parent.mkdir(parents=True, exist_ok=True)
        self._lock = RLock()
        self._connection = sqlite3.connect(selected, check_same_thread=False)
        self._connection.row_factory = sqlite3.Row
        self._connection.execute("PRAGMA foreign_keys = ON")
        self._connection.execute("PRAGMA journal_mode = WAL")
        self._create_schema()

    def close(self) -> None:
        with self._lock:
            self._connection.close()

    def _create_schema(self) -> None:
        with self._lock, self._connection:
            self._connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS repositories (
                    key TEXT PRIMARY KEY,
                    owner TEXT NOT NULL,
                    repo TEXT NOT NULL,
                    ref TEXT,
                    analysed_sha TEXT,
                    github_connected INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS project_profiles (
                    repository_key TEXT PRIMARY KEY REFERENCES repositories(key) ON DELETE CASCADE,
                    analysed_sha TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    generated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS scans (
                    id TEXT PRIMARY KEY,
                    repository_key TEXT NOT NULL REFERENCES repositories(key) ON DELETE CASCADE,
                    status TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS scans_repository_idx ON scans(repository_key, created_at DESC);
                CREATE TABLE IF NOT EXISTS papers (
                    identifier TEXT PRIMARY KEY,
                    url TEXT NOT NULL,
                    title TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    authors TEXT NOT NULL,
                    published_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS findings (
                    id TEXT PRIMARY KEY,
                    scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
                    repository_key TEXT NOT NULL REFERENCES repositories(key) ON DELETE CASCADE,
                    paper_id TEXT NOT NULL REFERENCES papers(identifier),
                    analysed_sha TEXT NOT NULL,
                    user_status TEXT NOT NULL DEFAULT 'new',
                    payload TEXT NOT NULL,
                    detected_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS findings_repository_idx ON findings(repository_key, detected_at DESC);
                CREATE TABLE IF NOT EXISTS scan_findings (
                    scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
                    finding_id TEXT NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
                    PRIMARY KEY(scan_id, finding_id)
                );
                CREATE TABLE IF NOT EXISTS processed_papers (
                    repository_key TEXT NOT NULL REFERENCES repositories(key) ON DELETE CASCADE,
                    paper_id TEXT NOT NULL,
                    processed_at TEXT NOT NULL,
                    PRIMARY KEY(repository_key, paper_id)
                );
                CREATE TABLE IF NOT EXISTS monitoring_preferences (
                    repository_key TEXT PRIMARY KEY REFERENCES repositories(key) ON DELETE CASCADE,
                    enabled INTEGER NOT NULL DEFAULT 0,
                    interval_hours INTEGER NOT NULL DEFAULT 24,
                    categories TEXT NOT NULL DEFAULT '[]',
                    publishing_enabled INTEGER NOT NULL DEFAULT 0,
                    updated_at TEXT NOT NULL
                );
                """
            )

    def reset(self) -> None:
        with self._lock, self._connection:
            for table in ("scan_findings", "findings", "processed_papers", "project_profiles", "scans", "papers", "monitoring_preferences", "repositories"):
                self._connection.execute(f"DELETE FROM {table}")

    def upsert_repository(self, repository: Repository, *, analysed_sha: str | None = None, github_connected: bool | None = None) -> RepositoryConnection:
        key = repository_key(repository)
        now = utc_now().isoformat()
        with self._lock, self._connection:
            existing = self._connection.execute("SELECT * FROM repositories WHERE key = ?", (key,)).fetchone()
            connected = int(github_connected if github_connected is not None else (bool(existing["github_connected"]) if existing else bool(os.getenv("GITHUB_TOKEN"))))
            created_at = existing["created_at"] if existing else now
            selected_ref = repository.ref if repository.ref is not None else (existing["ref"] if existing else None)
            selected_sha = analysed_sha if analysed_sha is not None else (existing["analysed_sha"] if existing else None)
            self._connection.execute(
                """INSERT INTO repositories(key, owner, repo, ref, analysed_sha, github_connected, created_at, updated_at)
                   VALUES(?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(key) DO UPDATE SET owner=excluded.owner, repo=excluded.repo, ref=excluded.ref,
                   analysed_sha=excluded.analysed_sha, github_connected=excluded.github_connected, updated_at=excluded.updated_at""",
                (key, repository.owner, repository.repo, selected_ref, selected_sha, connected, created_at, now),
            )
        return self.get_repository(repository.owner, repository.repo)

    def get_repository(self, owner: str, repo: str) -> RepositoryConnection:
        key = f"{owner.lower()}/{repo.lower()}"
        with self._lock:
            row = self._connection.execute("SELECT * FROM repositories WHERE key = ?", (key,)).fetchone()
        if row is None:
            raise KeyError(key)
        return self._repository_from_row(row)

    def list_repositories(self) -> list[RepositoryConnection]:
        with self._lock:
            rows = self._connection.execute("SELECT * FROM repositories ORDER BY updated_at DESC").fetchall()
        return [self._repository_from_row(row) for row in rows]

    @staticmethod
    def _repository_from_row(row: sqlite3.Row) -> RepositoryConnection:
        return RepositoryConnection(
            owner=row["owner"], repo=row["repo"], ref=row["ref"], analysed_sha=row["analysed_sha"],
            github_connected=bool(row["github_connected"]), created_at=row["created_at"], updated_at=row["updated_at"],
        )

    def save_scan(self, scan: Scan) -> None:
        payload = scan.model_dump_json()
        with self._lock, self._connection:
            self._connection.execute(
                """INSERT INTO scans(id, repository_key, status, payload, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?)
                   ON CONFLICT(id) DO UPDATE SET status=excluded.status, payload=excluded.payload, updated_at=excluded.updated_at""",
                (scan.id, repository_key(scan.repository), scan.status.value, payload, scan.created_at.isoformat(), scan.updated_at.isoformat()),
            )

    def get_scan(self, scan_id: str) -> Scan | None:
        with self._lock:
            row = self._connection.execute("SELECT payload FROM scans WHERE id = ?", (scan_id,)).fetchone()
        return Scan.model_validate_json(row["payload"]) if row else None

    def has_active_scan(self, repository: Repository) -> bool:
        with self._lock:
            row = self._connection.execute(
                "SELECT 1 FROM scans WHERE repository_key = ? AND status IN ('queued', 'running') LIMIT 1",
                (repository_key(repository),),
            ).fetchone()
        return row is not None

    def save_profile(self, profile: ProjectProfile) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                """INSERT INTO project_profiles(repository_key, analysed_sha, payload, generated_at) VALUES(?, ?, ?, ?)
                   ON CONFLICT(repository_key) DO UPDATE SET analysed_sha=excluded.analysed_sha, payload=excluded.payload, generated_at=excluded.generated_at""",
                (repository_key(profile.repository), profile.analysed_sha, profile.model_dump_json(), profile.generated_at.isoformat()),
            )

    def get_profile(self, repository: Repository) -> ProjectProfile | None:
        with self._lock:
            row = self._connection.execute("SELECT payload FROM project_profiles WHERE repository_key = ?", (repository_key(repository),)).fetchone()
        return ProjectProfile.model_validate_json(row["payload"]) if row else None

    def save_paper(self, paper: ArxivPaper) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                """INSERT INTO papers(identifier, url, title, summary, authors, published_at) VALUES(?, ?, ?, ?, ?, ?)
                   ON CONFLICT(identifier) DO UPDATE SET url=excluded.url, title=excluded.title, summary=excluded.summary,
                   authors=excluded.authors, published_at=excluded.published_at""",
                (paper.identifier, paper.url, paper.title, paper.summary, json.dumps(paper.authors), paper.published_at.isoformat()),
            )

    def save_finding(self, finding: Finding) -> None:
        with self._lock, self._connection:
            existing = self._connection.execute("SELECT user_status, payload FROM findings WHERE id = ?", (finding.id,)).fetchone()
            if existing:
                prior = Finding.model_validate_json(existing["payload"])
                finding = finding.model_copy(update={"user_status": FindingStatus(existing["user_status"]), "issue": prior.issue})
            self._connection.execute(
                """INSERT INTO findings(id, scan_id, repository_key, paper_id, analysed_sha, user_status, payload, detected_at)
                   VALUES(?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, detected_at=excluded.detected_at""",
                (finding.id, finding.scan_id, repository_key(finding.repository), finding.source.identifier, finding.analysed_sha,
                 finding.user_status.value, finding.model_dump_json(), finding.detected_at.isoformat()),
            )
            self._connection.execute(
                "INSERT OR IGNORE INTO scan_findings(scan_id, finding_id) VALUES(?, ?)",
                (finding.scan_id, finding.id),
            )

    def get_finding(self, finding_id: str) -> Finding | None:
        with self._lock:
            row = self._connection.execute("SELECT payload FROM findings WHERE id = ?", (finding_id,)).fetchone()
        return Finding.model_validate_json(row["payload"]) if row else None

    def list_findings(self, repository: Repository, scan_id: str | None = None) -> list[Finding]:
        params: list[str] = [repository_key(repository)]
        if scan_id:
            query = """SELECT findings.payload FROM findings
                       JOIN scan_findings ON scan_findings.finding_id = findings.id
                       WHERE findings.repository_key = ? AND scan_findings.scan_id = ?"""
            params.append(scan_id)
        else:
            query = "SELECT payload FROM findings WHERE repository_key = ?"
        query += " ORDER BY detected_at DESC"
        with self._lock:
            rows = self._connection.execute(query, params).fetchall()
        return [Finding.model_validate_json(row["payload"]) for row in rows]

    def update_finding_status(self, finding_id: str, status: FindingStatus) -> Finding | None:
        finding = self.get_finding(finding_id)
        if finding is None:
            return None
        updated = finding.model_copy(update={"user_status": status})
        with self._lock, self._connection:
            self._connection.execute("UPDATE findings SET user_status = ?, payload = ? WHERE id = ?", (status.value, updated.model_dump_json(), finding_id))
        return updated

    def update_finding_issue(self, finding_id: str, issue: FindingIssue) -> Finding | None:
        finding = self.get_finding(finding_id)
        if finding is None:
            return None
        updated = finding.model_copy(update={"issue": issue})
        with self._lock, self._connection:
            self._connection.execute("UPDATE findings SET payload = ? WHERE id = ?", (updated.model_dump_json(), finding_id))
        return updated

    def mark_processed(self, repository: Repository, paper_ids: list[str]) -> None:
        now = utc_now().isoformat()
        with self._lock, self._connection:
            self._connection.executemany(
                "INSERT OR IGNORE INTO processed_papers(repository_key, paper_id, processed_at) VALUES(?, ?, ?)",
                [(repository_key(repository), paper_id, now) for paper_id in paper_ids],
            )

    def processed_paper_ids(self, repository: Repository) -> set[str]:
        with self._lock:
            rows = self._connection.execute("SELECT paper_id FROM processed_papers WHERE repository_key = ?", (repository_key(repository),)).fetchall()
        return {row["paper_id"] for row in rows}
