from __future__ import annotations

from pathlib import Path

from scripts.validate_dataset import validate_dataset


def test_validator_uses_closed_temporary_database_and_cleans_up(built_backend, monkeypatch, tmp_path: Path) -> None:
    settings, _, _ = built_backend
    monkeypatch.setattr("tempfile.tempdir", str(tmp_path))
    payload = validate_dataset(settings.dataset_path)
    assert payload["valid"] is True
    assert list(tmp_path.glob("zarinpal-validation-*")) == []
