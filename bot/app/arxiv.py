import os
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from xml.etree import ElementTree

import httpx

ARXIV_API_URL = "https://export.arxiv.org/api/query"
DEFAULT_CATEGORIES = ("cs.AI", "cs.LG", "cs.CL")
ATOM_NAMESPACE = "http://www.w3.org/2005/Atom"


class ArxivError(Exception):
    """A safe, user-facing arXiv ingestion error."""


@dataclass(frozen=True)
class ArxivPaper:
    identifier: str
    url: str
    title: str
    summary: str
    authors: list[str]
    published_at: datetime


def _positive_int_from_env(name: str, default: int, maximum: int) -> int:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    try:
        value = int(raw_value)
    except ValueError as exc:
        raise ArxivError(f"{name} must be an integer.") from exc
    if not 1 <= value <= maximum:
        raise ArxivError(f"{name} must be between 1 and {maximum}.")
    return value


def categories_from_env() -> tuple[str, ...]:
    raw_value = os.getenv("RELEVANCE_ARXIV_CATEGORIES", ",".join(DEFAULT_CATEGORIES))
    categories = tuple(item.strip() for item in raw_value.split(",") if item.strip())
    if not categories:
        raise ArxivError("RELEVANCE_ARXIV_CATEGORIES must contain at least one category.")
    return categories


def parse_atom_feed(content: bytes) -> list[ArxivPaper]:
    try:
        root = ElementTree.fromstring(content)
    except ElementTree.ParseError as exc:
        raise ArxivError("arXiv returned malformed XML.") from exc

    namespace = {"atom": ATOM_NAMESPACE}
    papers: list[ArxivPaper] = []
    for entry in root.findall("atom:entry", namespace):
        identifier_url = _required_text(entry, "atom:id", namespace)
        title = _normalise_text(_required_text(entry, "atom:title", namespace))
        summary = _normalise_text(_required_text(entry, "atom:summary", namespace))
        published_text = _required_text(entry, "atom:published", namespace)
        authors = [
            _normalise_text(name.text or "")
            for name in entry.findall("atom:author/atom:name", namespace)
            if (name.text or "").strip()
        ]
        try:
            published_at = datetime.fromisoformat(published_text)
        except ValueError as exc:
            raise ArxivError("arXiv returned an invalid publication timestamp.") from exc

        identifier = identifier_url.rstrip("/").rsplit("/", 1)[-1]
        canonical_url = f"https://arxiv.org/abs/{identifier}"
        papers.append(
            ArxivPaper(
                identifier=f"arXiv:{identifier}",
                url=canonical_url,
                title=title,
                summary=summary,
                authors=authors,
                published_at=published_at,
            )
        )
    return papers


def _required_text(
    entry: ElementTree.Element,
    path: str,
    namespace: dict[str, str],
) -> str:
    element = entry.find(path, namespace)
    if element is None or not (element.text or "").strip():
        raise ArxivError("arXiv returned an entry with a required field missing.")
    return (element.text or "").strip()


def _normalise_text(value: str) -> str:
    return " ".join(value.split())


def fetch_recent_papers(
    transport: httpx.BaseTransport | None = None,
    *,
    categories: tuple[str, ...] | None = None,
    max_results: int | None = None,
    timeout_seconds: int | None = None,
) -> list[ArxivPaper]:
    selected_categories = categories or categories_from_env()
    selected_max_results = max_results or _positive_int_from_env(
        "RELEVANCE_ARXIV_MAX_RESULTS", 5, 25
    )
    selected_timeout = timeout_seconds or _positive_int_from_env(
        "RELEVANCE_ARXIV_TIMEOUT_SECONDS", 10, 60
    )
    query = " OR ".join(f"cat:{category}" for category in selected_categories)

    try:
        with httpx.Client(
            timeout=selected_timeout,
            transport=transport,
            headers={"User-Agent": "Relevance-Hackathon/0.1"},
        ) as client:
            response = client.get(
                ARXIV_API_URL,
                params={
                    "search_query": query,
                    "start": 0,
                    "max_results": selected_max_results,
                    "sortBy": "submittedDate",
                    "sortOrder": "descending",
                },
            )
            response.raise_for_status()
    except httpx.TimeoutException as exc:
        raise ArxivError("The arXiv request timed out.") from exc
    except httpx.HTTPError as exc:
        raise ArxivError("The arXiv request failed.") from exc

    return parse_atom_feed(response.content)


PaperProvider = Callable[[], list[ArxivPaper]]
