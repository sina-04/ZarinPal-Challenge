# syntax=docker/dockerfile:1.7
FROM python:3.12-slim-bookworm@sha256:a116514e19457bcb7af7efe9c3dd0b9b71e85b317694e7882a1c52aa15a78134 AS wheels
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 PIP_NO_CACHE_DIR=1
WORKDIR /build
COPY requirements.txt .
RUN pip wheel --wheel-dir /wheels -r requirements.txt

FROM python:3.12-slim-bookworm@sha256:a116514e19457bcb7af7efe9c3dd0b9b71e85b317694e7882a1c52aa15a78134 AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    TZ=Asia/Tehran \
    DATA_DIR=/app/data \
    DATABASE_PATH=/app/data/analytics.duckdb
WORKDIR /app
RUN groupadd --system app && useradd --system --gid app --home-dir /app app
COPY --from=wheels /wheels /wheels
COPY requirements.txt .
RUN pip install --no-index --find-links=/wheels -r requirements.txt && rm -rf /wheels
COPY app ./app
RUN mkdir -p /app/data /artifact && chown -R app:app /app /artifact

FROM base AS data-builder
ARG DATASET_URL="https://startech.s3.ir-thr-at1.arvanstorage.ir/other%2Fchallenge_data.csv.gz?versionId="
ARG DATASET_SHA256=""
ARG ALLOW_DEMO_FALLBACK="false"
ENV DATASET_URL=${DATASET_URL} \
    DATASET_SHA256=${DATASET_SHA256} \
    ALLOW_DEMO_FALLBACK=${ALLOW_DEMO_FALLBACK}
USER app
# Production builds must download and verify the pinned official source. CI and
# local builds may opt into the calibrated partial artifact only by explicitly
# passing --build-arg ALLOW_DEMO_FALLBACK=true.
RUN if [ "$ALLOW_DEMO_FALLBACK" = "true" ]; then \
      USE_DEMO_DATA=true python -m app.bootstrap \
        --database /artifact/analytics.duckdb --allow-demo-fallback; \
    else \
      test -n "$DATASET_SHA256" || \
        (echo 'DATASET_SHA256 is required for a production image.' >&2; exit 2); \
      USE_DEMO_DATA=false python -m app.bootstrap \
        --database /artifact/analytics.duckdb --download; \
    fi

FROM base AS runtime
ARG DATASET_URL="https://startech.s3.ir-thr-at1.arvanstorage.ir/other%2Fchallenge_data.csv.gz?versionId="
ARG DATASET_SHA256=""
ARG ALLOW_DEMO_FALLBACK="false"
ENV DATASET_URL=${DATASET_URL} \
    DATASET_SHA256=${DATASET_SHA256} \
    ALLOW_DEMO_FALLBACK=${ALLOW_DEMO_FALLBACK} \
    USE_DEMO_DATA=false
COPY --from=data-builder --chown=root:root /artifact/analytics.duckdb /app/data/analytics.duckdb
RUN chmod 0444 /app/data/analytics.duckdb && chmod 0555 /app/data
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:' + __import__('os').getenv('PORT','8000') + '/healthz', timeout=3)"
CMD ["python", "-m", "app"]
