from datetime import datetime
from enum import Enum
from typing import Annotated, Literal

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    StringConstraints,
)

SIMULATION_NOTICE = (
    "Demo simulation only: no repository was scanned and no GitHub issue was created."
)


def reject_dot_git_suffix(value: str) -> str:
    if value.lower().endswith(".git"):
        raise ValueError("repo must not include the .git suffix")
    return value


OwnerName = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=39,
        pattern=r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$",
    ),
]
RepositoryName = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=100,
        pattern=r"^[A-Za-z0-9._-]+$",
    ),
    AfterValidator(reject_dot_git_suffix),
]
GitRef = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)
]


class APIModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ScanStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class FindingSourceType(str, Enum):
    PAPER = "paper"
    CVE = "cve"


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class Relevance(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class IssueState(str, Enum):
    NOT_CREATED = "not_created"
    CREATED = "created"


class Repository(APIModel):
    owner: OwnerName = Field(description="GitHub repository owner or organization.")
    repo: RepositoryName = Field(description="GitHub repository name without an owner.")
    ref: GitRef | None = Field(
        default=None,
        description="Optional branch, tag, or commit. The demo does not resolve this ref.",
    )


class StartScanRequest(APIModel):
    repository: Repository


class ScanProgress(APIModel):
    percent: int = Field(ge=0, le=100)
    stage: str = Field(min_length=1, max_length=120)
    completed_steps: int = Field(ge=0)
    total_steps: int = Field(ge=1)


class Scan(APIModel):
    id: str = Field(description="Stable opaque scan identifier.")
    repository: Repository
    status: ScanStatus
    progress: ScanProgress
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None
    error: str | None = None
    simulated: Literal[True] = True
    simulation_notice: str = SIMULATION_NOTICE


class FindingSource(APIModel):
    type: FindingSourceType
    identifier: str = Field(min_length=1, max_length=200)
    url: HttpUrl
    published_at: datetime | None = None


class FindingIssue(APIModel):
    state: IssueState = IssueState.NOT_CREATED
    url: HttpUrl | None = None
    created_at: datetime | None = None


class Finding(APIModel):
    id: str = Field(description="Stable opaque finding identifier.")
    repository: Repository
    source: FindingSource
    severity: Severity
    relevance: Relevance
    title: str = Field(min_length=1, max_length=240)
    summary: str = Field(min_length=1, max_length=2000)
    suggested_action: str = Field(min_length=1, max_length=2000)
    detected_at: datetime
    issue: FindingIssue = Field(default_factory=FindingIssue)


class FindingsResponse(APIModel):
    repository: Repository
    scan_id: str | None = Field(
        default=None,
        description="The scan represented by these findings, when requested by scan ID.",
    )
    findings: list[Finding]
    count: int = Field(ge=0)
    simulated: Literal[True] = True
    simulation_notice: str = SIMULATION_NOTICE


class CreateIssueRequest(APIModel):
    approved: Literal[True] = Field(
        description="Explicit human approval. Only the literal value true is accepted."
    )


class IssueCreationResponse(APIModel):
    finding_id: str
    state: Literal[IssueState.CREATED] = IssueState.CREATED
    url: HttpUrl
    created_at: datetime
    simulated: Literal[True] = True
    simulation_notice: str = SIMULATION_NOTICE


class ErrorResponse(APIModel):
    detail: str


class HealthResponse(APIModel):
    status: Literal["ok"] = "ok"
    service: Literal["relevance-bot-api"] = "relevance-bot-api"
    simulated: Literal[True] = True
    simulation_notice: str = SIMULATION_NOTICE
