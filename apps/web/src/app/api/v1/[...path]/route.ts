import { getApiBaseUrl, internalHeaders } from "@/lib/server-api";

const forward = async (request: Request, context: RouteContext<"/api/v1/[...path]">) => {
  const { path } = await context.params;
  const incoming = new URL(request.url);
  const target = `${getApiBaseUrl()}/api/v1/${path.map(encodeURIComponent).join("/")}${incoming.search}`;
  try {
    const response = await fetch(target, {
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      headers: { ...internalHeaders(), "content-type": request.headers.get("content-type") ?? "application/json" },
      method: request.method,
      signal: AbortSignal.timeout(8_000),
    });
    return new Response(response.body, {
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
      status: response.status,
    });
  } catch {
    return Response.json({ detail: "Analytical API is temporarily unavailable." }, { status: 503 });
  }
};

export const GET = forward;
export const POST = forward;
