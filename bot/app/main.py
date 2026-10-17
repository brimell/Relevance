import os

from fastapi import FastAPI, HTTPException, Path, status
from fastapi.middleware.cors import CORSMiddleware

from .models import (
    CreateIssueRequest,
    CreateRepositoryRequest,
    ErrorResponse,
    Finding,
    FindingsResponse,
    HealthResponse,
    IssueCreationResponse,
    OwnerName,
    ProjectProfile,
    RepositoriesResponse,
    RepositoryConnection,
    RepositoryName,
    Scan,
    StartScanRequest,
    UpdateFindingRequest,
)
from .service import ConflictError, DemoService, ExternalServiceError, NotFoundError, demo_service


def cors_origins_from_env() -> list[str]:
    value = os.getenv("RELEVANCE_CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")
    return [origin.strip() for origin in value.split(",") if origin.strip()]


def create_app(service: DemoService = demo_service) -> FastAPI:
    app = FastAPI(
        title="Relevance Bot API",
        version="0.2.0",
        description=(
            "Repository-aware research scanning backed by shared SQLite persistence. API and scheduled scans "
            "use the same Git/ref ingestion, Nebius evaluation, finding records, and GitHub publisher."
        ),
    )
    origins = cors_origins_from_env()
    if origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=False,
            allow_methods=["GET", "POST", "PATCH"],
            allow_headers=["Content-Type"],
        )

    @app.get("/health", response_model=HealthResponse, tags=["system"])
    def health() -> HealthResponse:
        return HealthResponse(
            github_connected=bool(os.getenv("GITHUB_TOKEN")),
            evaluation_configured=bool(os.getenv("NEBIUS_API_KEY")),
        )

    @app.get("/api/v1/repositories", response_model=RepositoriesResponse, tags=["repositories"])
    def list_repositories() -> RepositoriesResponse:
        return service.list_repositories()

    @app.post("/api/v1/repositories", response_model=RepositoryConnection, status_code=status.HTTP_201_CREATED, tags=["repositories"])
    def connect_repository(request: CreateRepositoryRequest) -> RepositoryConnection:
        return service.connect_repository(request.repository)

    @app.get(
        "/api/v1/repositories/{owner}/{repo}/profile",
        response_model=ProjectProfile,
        responses={status.HTTP_404_NOT_FOUND: {"model": ErrorResponse}},
        tags=["repositories"],
    )
    def get_project_profile(owner: OwnerName, repo: RepositoryName) -> ProjectProfile:
        try:
            return service.get_project_profile(owner, repo)
        except NotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    @app.post(
        "/api/v1/scans",
        response_model=Scan,
        status_code=status.HTTP_202_ACCEPTED,
        responses={status.HTTP_409_CONFLICT: {"model": ErrorResponse}},
        tags=["scans"],
    )
    def start_scan(request: StartScanRequest) -> Scan:
        try:
            return service.start_scan(request.repository)
        except ConflictError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    @app.get(
        "/api/v1/scans/{scan_id}",
        response_model=Scan,
        responses={status.HTTP_404_NOT_FOUND: {"model": ErrorResponse}},
        tags=["scans"],
    )
    def get_scan(scan_id: str = Path(min_length=1, max_length=100)) -> Scan:
        try:
            return service.get_scan(scan_id)
        except NotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    @app.get(
        "/api/v1/scans/{scan_id}/findings",
        response_model=FindingsResponse,
        responses={
            status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
            status.HTTP_409_CONFLICT: {"model": ErrorResponse},
        },
        tags=["findings"],
    )
    def get_scan_findings(scan_id: str = Path(min_length=1, max_length=100)) -> FindingsResponse:
        try:
            return service.get_scan_findings(scan_id)
        except NotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
        except ConflictError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    @app.get("/api/v1/repositories/{owner}/{repo}/findings", response_model=FindingsResponse, tags=["findings"])
    def get_repository_findings(owner: OwnerName, repo: RepositoryName) -> FindingsResponse:
        return service.get_repository_findings(owner, repo)

    @app.patch(
        "/api/v1/findings/{finding_id}",
        response_model=Finding,
        responses={status.HTTP_404_NOT_FOUND: {"model": ErrorResponse}},
        tags=["findings"],
    )
    def update_finding(request: UpdateFindingRequest, finding_id: str = Path(min_length=1, max_length=100)) -> Finding:
        try:
            return service.update_finding_status(finding_id, request.status)
        except NotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    @app.post(
        "/api/v1/findings/{finding_id}/issues",
        response_model=IssueCreationResponse,
        responses={
            status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
            status.HTTP_502_BAD_GATEWAY: {"model": ErrorResponse},
        },
        tags=["issues"],
        summary="Idempotently publish a stored finding to GitHub",
    )
    def create_issue(request: CreateIssueRequest, finding_id: str = Path(min_length=1, max_length=100)) -> IssueCreationResponse:
        del request
        try:
            return service.create_issue(finding_id)
        except NotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
        except ExternalServiceError as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return app


app = create_app()
