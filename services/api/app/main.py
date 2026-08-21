from __future__ import annotations

import secrets
import threading
import json
from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path
from typing import AsyncIterator

import duckdb
from fastapi import FastAPI, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse

from app import __version__
from app.bootstrap import (
    EMBEDDED_DEMO_SHA256,
    SourceUnavailableError,
    bootstrap_database,
)
from app.config import Settings, get_settings
from app.constants import ADJUSTED_FEE_NOTICE
from app.evidence import RegistryError
from app.metrics import AnalyticsRepository
from app.schemas import (
    DashboardResponse,
    EvidenceRecordsResponse,
    EvidenceResponse,
    HealthResponse,
    MerchantListResponse,
)


_bootstrap_lock = threading.Lock()


def _database_is_ready(path: Path) -> bool:
    if not path.exists() or path.stat().st_size == 0:
        return False
    try:
        with duckdb.connect(str(path), read_only=True) as connection:
            return bool(
                connection.execute(
                    "SELECT count(*) = 1 FROM information_schema.tables WHERE table_name = 'build_manifest'"
                ).fetchone()[0]
            )
    except duckdb.Error:
        return False


def _database_manifest(path: Path) -> dict[str, object]:
    if not _database_is_ready(path):
        return {}
    try:
        with duckdb.connect(str(path), read_only=True) as connection:
            raw = dict(connection.execute("SELECT key, value FROM build_manifest").fetchall())
    except duckdb.Error:
        return {}
    parsed: dict[str, object] = {}
    for key, value in raw.items():
        try:
            parsed[key] = json.loads(value)
        except (json.JSONDecodeError, TypeError):
            parsed[key] = value
    return parsed


def _database_is_authorized(settings: Settings) -> bool:
    manifest = _database_manifest(settings.database_path)
    if not manifest:
        return False
    source_kind = str(manifest.get("source_kind", ""))
    is_demo = source_kind == "embedded_demo"
    demo_authorized = settings.force_demo_data or settings.allow_demo_fallback
    if settings.force_demo_data:
        return (
            is_demo
            and str(manifest.get("source_sha256", "")) == EMBEDDED_DEMO_SHA256
            and str(manifest.get("checksum_status", "")) == "embedded-versioned"
        )
    if is_demo and not demo_authorized:
        return False
    if settings.dataset_sha256:
        return (
            str(manifest.get("source_sha256", "")).lower() == settings.dataset_sha256.lower()
            and str(manifest.get("checksum_status", "")) == "verified"
        )
    if source_kind.startswith("official_csv_gz") and not settings.allow_demo_fallback:
        # A production URL artifact without an expected hash is never accepted,
        # even if it was created by an older application version.
        return False
    return True


def ensure_database(settings: Settings) -> None:
    if _database_is_authorized(settings):
        return
    with _bootstrap_lock:
        if _database_is_authorized(settings):
            return
        if (
            not settings.allow_demo_fallback
            and not settings.force_demo_data
            and settings.dataset_path is None
            and not settings.dataset_sha256
        ):
            raise SourceUnavailableError(
                "DATASET_SHA256 is required before production URL bootstrap."
            )
        bootstrap_database(
            settings,
            download=True,
            allow_demo_fallback=settings.allow_demo_fallback,
        )


def create_app(settings: Settings | None = None) -> FastAPI:
    configured_settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        ensure_database(configured_settings)
        application.state.repository = AnalyticsRepository(configured_settings.database_path)
        yield

    application = FastAPI(
        title="نبض زرین — ZarinPal Merchant Analytics API",
        summary="Deterministic, traceable merchant analytics at canonical payment grains.",
        version=__version__,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url=None,
    )
    application.state.settings = configured_settings

    @application.middleware("http")
    async def internal_api_key(request: Request, call_next):  # type: ignore[no-untyped-def]
        required_key = configured_settings.internal_api_key
        # The deployment contract exposes only health publicly. Local schema
        # generation remains convenient when INTERNAL_API_KEY is unset.
        if request.url.path != "/healthz" and required_key:
            supplied_key = request.headers.get("X-Internal-API-Key", "")
            if not secrets.compare_digest(supplied_key, required_key):
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Invalid or missing internal API key."},
                )
        return await call_next(request)

    def repository(request: Request) -> AnalyticsRepository:
        return request.app.state.repository

    @application.get("/healthz", response_model=HealthResponse, tags=["system"])
    def health(request: Request) -> HealthResponse:
        ready = _database_is_ready(configured_settings.database_path)
        manifest: dict[str, object] = {}
        if ready and hasattr(request.app.state, "repository"):
            manifest = repository(request).manifest()
        return HealthResponse(
            status="ok" if ready and not bool(manifest.get("partial_data", False)) else "degraded",
            database_ready=ready,
            source_kind=str(manifest.get("source_kind")) if manifest.get("source_kind") else None,
            source_sha256=str(manifest.get("source_sha256")) if manifest.get("source_sha256") else None,
            checksum_status=str(manifest.get("checksum_status")) if manifest.get("checksum_status") else None,
            build_id=str(manifest.get("build_id")) if manifest.get("build_id") else None,
            auth_configured=bool(configured_settings.internal_api_key),
        )

    @application.get("/api/v1/merchants", response_model=MerchantListResponse, tags=["analytics"])
    def merchants(request: Request) -> MerchantListResponse:
        items = repository(request).merchants()
        return MerchantListResponse(
            items=items,
            total=len(items),
            adjusted_fee_notice=ADJUSTED_FEE_NOTICE,
        )

    @application.get("/api/v1/dashboard", response_model=DashboardResponse, tags=["analytics"])
    def dashboard(
        request: Request,
        merchant_key: str = Query(..., min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_]+$"),
        date_from: date | None = Query(None, alias="from"),
        date_to: date | None = Query(None, alias="to"),
    ) -> DashboardResponse:
        repo = repository(request)
        try:
            default_from, default_to = repo.date_range(merchant_key)
            payload = repo.dashboard(
                merchant_key,
                date_from or default_from,
                date_to or default_to,
            )
            return DashboardResponse.model_validate(payload)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Merchant was not found.") from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    @application.get(
        "/api/v1/insights/{insight_id}/evidence",
        response_model=EvidenceResponse,
        tags=["evidence"],
    )
    def evidence(request: Request, insight_id: str) -> EvidenceResponse:
        try:
            return EvidenceResponse(evidence=repository(request).evidence(insight_id))
        except (KeyError, ValueError, RegistryError) as exc:
            raise HTTPException(status_code=404, detail="Insight evidence was not found.") from exc

    @application.get(
        "/api/v1/insights/{insight_id}/records",
        response_model=EvidenceRecordsResponse,
        tags=["evidence"],
    )
    def records(
        request: Request,
        insight_id: str,
        page: int = Query(1, ge=1),
        page_size: int = Query(25, ge=1, le=100),
    ) -> EvidenceRecordsResponse:
        try:
            return EvidenceRecordsResponse.model_validate(
                repository(request).records(insight_id, page, page_size)
            )
        except (KeyError, ValueError, RegistryError) as exc:
            raise HTTPException(status_code=404, detail="Insight evidence was not found.") from exc

    return application


app = create_app()
