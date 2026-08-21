import { getApiBaseUrl } from "@/lib/server-api";

type HealthPayload = Record<string, unknown> & {
  status?: unknown;
  database_ready?: unknown;
};

const unavailablePayload = (detail: string, upstreamStatus?: number) => ({
  status: "degraded",
  database_ready: false,
  upstream_available: false,
  ...(upstreamStatus == null ? {} : { upstream_status: upstreamStatus }),
  detail,
});

export async function GET() {
  try {
    const response = await fetch(`${getApiBaseUrl()}/healthz`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1_500),
    });

    if (!response.ok) {
      return Response.json(
        unavailablePayload("FastAPI health endpoint returned an error.", response.status),
        { status: 503 },
      );
    }

    let payload: HealthPayload;
    try {
      payload = (await response.json()) as HealthPayload;
    } catch {
      return Response.json(
        unavailablePayload("FastAPI health response was not valid JSON."),
        { status: 503 },
      );
    }

    const recognizedStatus = payload.status === "ok" || payload.status === "degraded";
    const serving = recognizedStatus && payload.database_ready === true;
    return Response.json(
      {
        ...payload,
        upstream_available: true,
      },
      { status: serving ? 200 : 503 },
    );
  } catch {
    return Response.json(
      unavailablePayload("FastAPI health endpoint is unreachable."),
      { status: 503 },
    );
  }
}
