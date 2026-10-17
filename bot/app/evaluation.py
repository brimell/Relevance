import json
import os
import re
from dataclasses import asdict
from typing import Any

import httpx

from .arxiv import ArxivPaper
from .models import EvidenceLabel, FindingType, ProjectProfile, Relevance, Severity
from .repository import RepositorySnapshot

DEFAULT_NEBIUS_URL = "https://api.tokenfactory.nebius.com/v1"
NEBIUS_MODEL = "meta-llama/Llama-3.3-70B-Instruct"


class EvaluationError(Exception):
    pass


def required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise EvaluationError(f"{name} is required to evaluate repository-aware findings.")
    return value


def shortlist_papers(papers: list[ArxivPaper], profile: ProjectProfile, limit: int = 10) -> list[ArxivPaper]:
    terms = set(re.findall(r"[a-z0-9+#.-]{3,}", " ".join([profile.summary, *profile.methods, *profile.research_topics]).lower()))

    def score(paper: ArxivPaper) -> tuple[int, str]:
        title_terms = set(re.findall(r"[a-z0-9+#.-]{3,}", paper.title.lower()))
        abstract_terms = set(re.findall(r"[a-z0-9+#.-]{3,}", paper.summary.lower()))
        return (3 * len(terms & title_terms) + len(terms & abstract_terms), paper.published_at.isoformat())

    return sorted(papers, key=score, reverse=True)[:limit]


def evaluate_with_nebius(
    papers: list[ArxivPaper],
    snapshot: RepositorySnapshot,
    profile: ProjectProfile,
    max_findings: int = 5,
) -> list[dict[str, Any]]:
    if not papers:
        return []
    api_key = required_env("NEBIUS_API_KEY")
    model = NEBIUS_MODEL
    base_url = os.getenv("NEBIUS_BASE_URL", DEFAULT_NEBIUS_URL).rstrip("/")
    paper_data = [asdict(paper) for paper in papers]
    for paper in paper_data:
        paper["published_at"] = paper["published_at"].isoformat()

    prompt = f"""Evaluate these arXiv abstracts against the repository snapshot at commit {snapshot.sha}.
Return at most {max_findings} findings and omit weak, generic, or ungrounded matches.
Every affectedFiles entry must exactly match one of the file paths in the supplied context.
Separate what the paper reports from your inference about this repository. Do not claim that an improvement is proven or that the full paper was read.
The suggested experiment must be concrete and testable in this repository.

Repository: {snapshot.repository.owner}/{snapshot.repository.repo}
Project profile: {profile.model_dump_json()}
Repository context:\n{snapshot.context}

Paper metadata and abstracts:\n{json.dumps(paper_data)}

Return JSON only:
{{
  "findings": [{{
    "paperId": "exact identifier from input",
    "findingType": "potential_improvement | challenges_assumption | new_technique",
    "whyRelevant": "specific repository inference",
    "affectedFiles": ["exact/path/from/context"],
    "suggestedAction": "concrete experiment",
    "confidence": 0.0
  }}]
}}
"""
    try:
        response = httpx.post(
            f"{base_url}/chat/completions",
            timeout=60,
            headers={"Authorization": "Bearer " + api_key},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": "You are a cautious research reviewer. Ground every repository claim in supplied source files."},
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
        raise EvaluationError("Nebius evaluation failed or returned invalid JSON.") from exc
    return validate_evaluation(result, papers, snapshot, max_findings)


def validate_evaluation(
    result: dict[str, Any], papers: list[ArxivPaper], snapshot: RepositorySnapshot, max_findings: int
) -> list[dict[str, Any]]:
    raw_findings = result.get("findings")
    if not isinstance(raw_findings, list):
        raise EvaluationError("Nebius returned an invalid result shape.")
    paper_ids = {paper.identifier for paper in papers}
    available_paths = set(snapshot.files)
    accepted: list[dict[str, Any]] = []
    required = {"paperId", "findingType", "whyRelevant", "affectedFiles", "suggestedAction", "confidence"}
    for raw in raw_findings:
        if not isinstance(raw, dict) or not required <= raw.keys() or raw["paperId"] not in paper_ids:
            continue
        if raw["findingType"] not in {item.value for item in FindingType}:
            continue
        confidence = raw["confidence"]
        if not isinstance(confidence, (int, float)) or not 0.7 <= float(confidence) <= 1:
            continue
        paths = raw["affectedFiles"]
        if not isinstance(paths, list):
            continue
        grounded_paths = list(dict.fromkeys(path for path in paths if isinstance(path, str) and path in available_paths))
        why = raw["whyRelevant"]
        action = raw["suggestedAction"]
        if not grounded_paths or not isinstance(why, str) or len(why.strip()) < 30 or not isinstance(action, str) or len(action.strip()) < 15:
            continue
        accepted.append({**raw, "affectedFiles": grounded_paths, "confidence": float(confidence)})
        if len(accepted) >= max_findings:
            break
    return accepted


def presentation_for_confidence(confidence: float) -> tuple[EvidenceLabel, Relevance, Severity]:
    if confidence >= 0.85:
        return EvidenceLabel.STRONG_MATCH, Relevance.HIGH, Severity.MEDIUM
    if confidence >= 0.75:
        return EvidenceLabel.WORTH_REVIEWING, Relevance.MEDIUM, Severity.LOW
    return EvidenceLabel.EXPLORATORY, Relevance.LOW, Severity.INFO
