from datetime import UTC, datetime

from app.arxiv import ArxivPaper
from app.daily import parse_state, render_state, validate_result


def paper() -> ArxivPaper:
    return ArxivPaper(
        identifier="arXiv:2601.00001v1",
        url="https://arxiv.org/abs/2601.00001v1",
        title="Paper",
        summary="Abstract",
        authors=["Researcher"],
        published_at=datetime(2026, 1, 2, tzinfo=UTC),
    )


def test_state_round_trip() -> None:
    state = {
        "processedPaperIds": ["arXiv:2601.00001v1"],
        "inferredCategories": ["cs.SE"],
    }

    assert parse_state(render_state(state)) == state


def test_result_validation_keeps_only_grounded_high_confidence_findings() -> None:
    result = {
        "findings": [
            {
                "paperId": "arXiv:2601.00001v1",
                "title": "Investigate this",
                "whyRelevant": "The dependency manifest supports the connection.",
                "affectedFiles": ["requirements.txt"],
                "suggestedAction": "Run a comparison.",
                "confidence": 0.8,
            },
            {
                "paperId": "arXiv:made-up",
                "title": "Hallucinated paper",
                "whyRelevant": "Unknown",
                "affectedFiles": [],
                "suggestedAction": "Ignore",
                "confidence": 1.0,
            },
        ],
        "inferredCategories": ["cs.SE", "not valid"],
    }

    findings, categories = validate_result(result, [paper()], 3)

    assert [finding["title"] for finding in findings] == ["Investigate this"]
    assert categories == ["cs.SE"]
