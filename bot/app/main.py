import os

from fastapi import FastAPI, HTTPException, Path, status
from fastapi.middleware.cors import CORSMiddleware

from .models import (
    CreateIssueRequest,
    ErrorResponse,
    FindingsResponse,
    HealthResponse,
    IssueCreationResponse,
    OwnerName,
    RepositoryName,
    Scan,
    StartScanRequest,
)
from .service import ConflictError, DemoService, NotFoundError, demo_service


def cors_origins_from_env() -> list[str]:
    value = os.getenv(
        "RELEVANCE_CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173",
    )
    return [origin.strip() for origin in value.split(",") if origin.strip()]


def create_app(service: DemoService = demo_service) -> FastAPI:
    app = FastAPI(
        title="Relevance Bot API",
        version="0.1.0",
        description=(
            "Typed API contract for Relevance. A scan fetches recent paper metadata from arXiv. "
            "Repository analysis, persistence, relevance scoring, and GitHub issue creation remain "
            "simulated. Polling advances a scan from queued to running and then performs the fetch."
        ),
    )

    origins = cors_origins_from_env()
    if origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=False,
            allow_methods=["GET", "POST"],
            allow_headers=["Content-Type"],
        )

    @app.get(
        "/health",
        response_model=HealthResponse,
        tags=["system"],
        summary="Check API availability",
    )
    def health() -> HealthResponse:
        return HealthResponse()

    @app.post(
        "/api/v1/scans",
        response_model=Scan,
        status_code=status.HTTP_202_ACCEPTED,
        responses={
            status.HTTP_409_CONFLICT: {
                "model": ErrorResponse,
                "description": "A scan for the repository is already active.",
            }
        },
        tags=["scans"],
        summary="Queue a repository research scan",
        description=(
            "Creates an in-memory scan in queued state. It does not access the repository. "
            "Completion fetches recent papers from arXiv. A second active scan for the same "
            "owner/repo returns 409."
        ),
    )
    def start_scan(request: StartScanRequest) -> Scan:
        try:
            return service.start_scan(request.repository)
        except ConflictError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail=str(exc)
            ) from exc

    @app.get(
        "/api/v1/scans/{scan_id}",
        response_model=Scan,
        responses={
            status.HTTP_404_NOT_FOUND: {
                "model": ErrorResponse,
                "description": "The scan was not found.",
            }
        },
        tags=["scans"],
        summary="Get scan status",
        description=(
            "The first poll advances queued to running. The second fetches arXiv papers and "
            "moves the scan to completed, or failed when ingestion fails."
        ),
    )
    def get_scan(scan_id: str = Path(min_length=1, max_length=100)) -> Scan:
        try:
            return service.get_scan(scan_id)
        except NotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
            ) from exc

    @app.get(
        "/api/v1/scans/{scan_id}/findings",
        response_model=FindingsResponse,
        responses={
            status.HTTP_404_NOT_FOUND: {
                "model": ErrorResponse,
                "description": "The scan was not found.",
            },
            status.HTTP_409_CONFLICT: {
                "model": ErrorResponse,
                "description": "The scan has not completed.",
            },
        },
        tags=["findings"],
        summary="Get live arXiv findings from a completed scan",
    )
    def get_scan_findings(
        scan_id: str = Path(min_length=1, max_length=100),
    ) -> FindingsResponse:
        try:
            return service.get_scan_findings(scan_id)
        except NotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
            ) from exc
        except ConflictError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail=str(exc)
            ) from exc

    @app.get(
        "/api/v1/repositories/{owner}/{repo}/findings",
        response_model=FindingsResponse,
        tags=["findings"],
        summary="Get prior in-memory findings for a repository",
        description=(
            "Returns completed demo findings generated during this process. An unknown but valid "
            "repository returns an empty list because this demo does not query GitHub."
        ),
    )
    def get_repository_findings(
        owner: OwnerName,
        repo: RepositoryName,
    ) -> FindingsResponse:
        return service.get_repository_findings(owner, repo)

    @app.post(
        "/api/v1/findings/{finding_id}/issues",
        response_model=IssueCreationResponse,
        status_code=status.HTTP_201_CREATED,
        responses={
            status.HTTP_404_NOT_FOUND: {
                "model": ErrorResponse,
                "description": "The finding was not found.",
            },
            status.HTTP_409_CONFLICT: {
                "model": ErrorResponse,
                "description": "An issue has already been created for the finding.",
            },
        },
        tags=["issues"],
        summary="Simulate GitHub issue creation for an approved finding",
        description=(
            'Requires {"approved": true}. Returns a non-actionable example.invalid URL and '
            "does not authenticate with or call GitHub. Repeated creation returns 409."
        ),
    )
    def create_issue(
        request: CreateIssueRequest,
        finding_id: str = Path(min_length=1, max_length=100),
    ) -> IssueCreationResponse:
        del request  # Validation of the literal approval is the required gate.
        try:
            return service.create_issue(finding_id)
        except NotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
            ) from exc
        except ConflictError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail=str(exc)
            ) from exc

    return app


app = create_app()
