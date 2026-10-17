import httpx
import pytest

from app.arxiv import ARXIV_API_URL, ArxivError, fetch_recent_papers, parse_atom_feed

ATOM_FEED = b"""<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2601.00001v1</id>
    <published>2026-01-02T03:04:05Z</published>
    <title>A useful\n      paper</title>
    <summary>This paper\n      explains a method.</summary>
    <author><name>Ada Lovelace</name></author>
    <author><name>Alan Turing</name></author>
  </entry>
</feed>
"""


def test_parse_atom_feed_extracts_paper_metadata() -> None:
    papers = parse_atom_feed(ATOM_FEED)

    assert len(papers) == 1
    paper = papers[0]
    assert paper.identifier == "arXiv:2601.00001v1"
    assert paper.url == "https://arxiv.org/abs/2601.00001v1"
    assert paper.title == "A useful paper"
    assert paper.summary == "This paper explains a method."
    assert paper.authors == ["Ada Lovelace", "Alan Turing"]
    assert paper.published_at.isoformat() == "2026-01-02T03:04:05+00:00"


def test_fetch_recent_papers_sends_configured_query(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RELEVANCE_ARXIV_CATEGORIES", "cs.AI, cs.LG")
    monkeypatch.setenv("RELEVANCE_ARXIV_MAX_RESULTS", "3")
    seen_request: httpx.Request | None = None

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal seen_request
        seen_request = request
        return httpx.Response(200, content=ATOM_FEED)

    papers = fetch_recent_papers(transport=httpx.MockTransport(handler))

    assert len(papers) == 1
    assert seen_request is not None
    assert str(seen_request.url).startswith(ARXIV_API_URL)
    assert seen_request.url.params["search_query"] == "cat:cs.AI OR cat:cs.LG"
    assert seen_request.url.params["max_results"] == "3"
    assert seen_request.url.params["sortBy"] == "submittedDate"


def test_fetch_recent_papers_hides_http_response_details() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, text="internal upstream detail")

    with pytest.raises(ArxivError, match="The arXiv request failed") as error:
        fetch_recent_papers(transport=httpx.MockTransport(handler))

    assert "internal upstream detail" not in str(error.value)


def test_parse_atom_feed_rejects_malformed_xml() -> None:
    with pytest.raises(ArxivError, match="malformed XML"):
        parse_atom_feed(b"<feed>")
