from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


OFFICIAL_DATASET_URL = (
    "https://startech.s3.ir-thr-at1.arvanstorage.ir/"
    "other%2Fchallenge_data.csv.gz?versionId="
)
LOCAL_CLEANED_XLSX_SHA256 = "34b265c9d9c9fd865a838ed017fd7d62625f6d41ae23bfe7cca59e6a36d82693"
LOCAL_CLEANED_XLSX_BYTES = 119_901_253


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True, slots=True)
class Settings:
    base_dir: Path
    data_dir: Path
    database_path: Path
    dataset_path: Path | None
    dataset_url: str
    dataset_sha256: str | None
    internal_api_key: str | None
    allow_demo_fallback: bool
    force_demo_data: bool = False
    timezone: str = "Asia/Tehran"

    @classmethod
    def from_env(cls) -> "Settings":
        base_dir = Path(__file__).resolve().parents[1]
        data_dir = Path(os.getenv("DATA_DIR", base_dir / "data")).resolve()
        configured_source = os.getenv("DATASET_PATH")
        configured_database = os.getenv("DATABASE_PATH")
        expected_hash = os.getenv("DATASET_SHA256", "").strip().lower() or None
        internal_key = os.getenv("INTERNAL_API_KEY", "").strip() or None
        return cls(
            base_dir=base_dir,
            data_dir=data_dir,
            database_path=Path(
                configured_database or data_dir / "analytics.duckdb"
            ).resolve(),
            dataset_path=(
                Path(configured_source).expanduser().resolve()
                if configured_source
                else None
            ),
            dataset_url=os.getenv("DATASET_URL", OFFICIAL_DATASET_URL),
            dataset_sha256=expected_hash,
            internal_api_key=internal_key,
            allow_demo_fallback=_env_bool("ALLOW_DEMO_FALLBACK", False),
            force_demo_data=_env_bool("USE_DEMO_DATA", False),
        )

    @property
    def workspace_root(self) -> Path:
        return self.base_dir.parents[1]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings.from_env()
