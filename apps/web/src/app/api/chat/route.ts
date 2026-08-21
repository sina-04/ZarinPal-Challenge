import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  streamText,
  type UIMessage,
} from "ai";

import {
  dashboardFiltersFromSearchParams,
  type DashboardFilters,
} from "@/lib/dashboard-filters";
import type { DashboardData } from "@/lib/dashboard-types";
import {
  getApiBaseUrl,
  getDashboard,
  internalHeaders,
} from "@/lib/server-api";

export const maxDuration = 30;

const limits = new Map<string, { count: number; resetAt: number }>();
const FALLBACK_MARKER = "پاسخ قطعی بر پایه شواهد ثبت‌شده";

function allowed(request: Request) {
  const key =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  if (limits.size > 500) {
    for (const [candidate, entry] of limits) {
      if (entry.resetAt <= now) limits.delete(candidate);
    }
  }
  if (limits.size > 1_000) {
    const oldest = limits.keys().next().value as string | undefined;
    if (oldest) limits.delete(oldest);
  }

  const current = limits.get(key);
  if (!current || current.resetAt <= now) {
    limits.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (current.count >= 8) return false;
  current.count += 1;
  return true;
}

function numberFa(value: number) {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(value);
}

function percentFa(value: number) {
  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
    style: "percent",
  }).format(value);
}

function deterministicFallback(dashboard: DashboardData) {
  const conversion = dashboard.kpis.find(
    (kpi) => kpi.metric_id === "verified_session_rate",
  );
  const sessions = dashboard.kpis.find(
    (kpi) => kpi.metric_id === "eligible_sessions",
  );
  const verifiedCount = dashboard.lifecycle.stages.find(
    (stage) => stage.stage === "Verified",
  )?.count;
  const facts: string[] = [];

  if (
    typeof sessions?.value === "number" &&
    typeof verifiedCount === "number" &&
    typeof conversion?.value === "number"
  ) {
    facts.push(
      `از ${numberFa(sessions.value)} نشست، ${numberFa(verifiedCount)} نشست تأیید شده و نرخ تکمیل ${percentFa(conversion.value)} است [verified_session_rate]`,
    );
  }
  if (dashboard.retry.rescued_sessions > 0) {
    facts.push(
      `${numberFa(dashboard.retry.rescued_sessions)} نشست چندتلاشی در نهایت تأیید شده‌اند [rescued_sessions]`,
    );
  }
  if (dashboard.paid_not_verified.sessions > 0) {
    facts.push(
      `${numberFa(dashboard.paid_not_verified.sessions)} نشست Paid به Verified نرسیده‌اند [paid_not_verified_rate]`,
    );
  }
  const body =
    facts.length > 0
      ? facts.join("؛ ")
      : "برای فیلتر فعال، عدد قابل استناد کافی در پاسخ تحلیلی ثبت نشده است";
  return `${FALLBACK_MARKER}: پذیرنده ${dashboard.meta.merchant_key} در بازه ${dashboard.meta.date_from} تا ${dashboard.meta.date_to}: ${body}. این جمع‌بندی توصیفی است؛ adjusted_fee تعرفه واقعی زرین‌پال نیست و هیچ ادعای علّی یا پیش‌بینی ارائه نمی‌شود.`;
}

function fallbackResponse(text: string) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const id = "fallback-evidence";
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: text });
      writer.write({ type: "text-end", id });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

async function fetchEvidence(insightId: string) {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/insights/${encodeURIComponent(insightId)}/evidence`,
    {
      cache: "no-store",
      headers: internalHeaders(),
      signal: AbortSignal.timeout(4_000),
    },
  );
  if (!response.ok) throw new Error(`Evidence API ${response.status}`);
  const body = (await response.json()) as { evidence?: unknown };
  if (!body.evidence || typeof body.evidence !== "object") {
    throw new Error("Evidence payload missing");
  }
  return body.evidence as Record<string, unknown>;
}

function requestedFilters(body: Record<string, unknown>): DashboardFilters | null {
  const raw = {
    merchant_key:
      typeof body.merchant_key === "string" ? body.merchant_key : undefined,
    from: typeof body.from === "string" ? body.from : undefined,
    to: typeof body.to === "string" ? body.to : undefined,
  };
  let filters: DashboardFilters;
  try {
    filters = dashboardFiltersFromSearchParams(raw);
  } catch {
    return null;
  }
  if (
    (raw.merchant_key && raw.merchant_key !== filters.merchant_key) ||
    (raw.from && raw.from !== filters.from) ||
    (raw.to && raw.to !== filters.to)
  ) {
    return null;
  }
  return filters;
}

export async function POST(request: Request) {
  if (!allowed(request)) {
    return Response.json(
      { error: "برای یک دقیقه بیش از حد مجاز پرسش فرستاده شد." },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "بدنه درخواست معتبر نیست." }, { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length > 20) {
    return Response.json({ error: "تاریخچه گفتگو معتبر نیست." }, { status: 400 });
  }
  const validatedMessages = await safeValidateUIMessages<UIMessage>({
    messages: body.messages,
  });
  if (!validatedMessages.success) {
    return Response.json({ error: "ساختار پیام‌های گفتگو معتبر نیست." }, { status: 400 });
  }
  const messages = validatedMessages.data;
  const filters = requestedFilters(body);
  if (!filters) {
    return Response.json({ error: "فیلترهای تحلیلی معتبر نیستند." }, { status: 400 });
  }

  const lastText =
    messages
      .at(-1)
      ?.parts.filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("") ?? "";
  if (
    messages.at(-1)?.role !== "user" ||
    !lastText.trim() ||
    lastText.length > 600
  ) {
    return Response.json(
      { error: "پرسش باید بین ۱ تا ۶۰۰ نویسه باشد." },
      { status: 400 },
    );
  }

  let dashboard: DashboardData;
  try {
    dashboard = await getDashboard(filters);
  } catch {
    return fallbackResponse(
      `${FALLBACK_MARKER}: API تحلیلی برای فیلتر فعال در دسترس نیست؛ هیچ عدد پذیرنده دیگری جایگزین نشد. محاسبه‌های ذخیره‌نشده یا حدسی نمایش داده نمی‌شوند.`,
    );
  }
  const fallback = deterministicFallback(dashboard);
  if (!process.env.OPENAI_API_KEY) return fallbackResponse(fallback);

  const evidenceIds = [
    dashboard.kpis.find((kpi) => kpi.metric_id === "verified_session_rate")
      ?.evidence_id,
    dashboard.retry.rescued_evidence_id ?? dashboard.retry.evidence_id,
    dashboard.paid_not_verified.evidence_id,
  ].filter((item): item is string => Boolean(item));

  const evidenceResults = await Promise.allSettled(
    evidenceIds.map((insightId) => fetchEvidence(insightId)),
  );
  const evidence = evidenceResults.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  if (evidence.length === 0) return fallbackResponse(fallback);

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const grounding = {
    authorized_filters: filters,
    evidence,
    metric_glossary: dashboard.metric_registry,
    approved_limitations: [
      "روابط مشاهده‌ای علّی نیستند.",
      "سناریوی حسابی فرصت پیش‌بینی نیست.",
      "adjusted_fee یک مقدار یکنواخت تبدیل‌شده است و تعرفه واقعی زرین‌پال نیست.",
      "کد پاسخ PSP بدون codebook معتبر معناگذاری نمی‌شود.",
    ],
  };
  try {
    const result = streamText({
      messages: await convertToModelMessages(messages),
      model: openai.responses(process.env.OPENAI_MODEL ?? "gpt-5.6-sol"),
      providerOptions: { openai: { store: false } },
      system: `شما تحلیل‌گر فارسی نبض زرین هستید. فقط شواهد معتبر JSON زیر را توضیح دهید. هیچ عدد تازه‌ای محاسبه، تعمیم یا حدس نزنید. هر ادعای واقعی را با [metric_id] یا [insight_id] خودش نشانه‌گذاری کنید. فقط درباره پذیرنده و بازه مجاز پاسخ دهید. اگر شواهد کافی نیست، صریح بگویید. adjusted_fee تعرفه واقعی زرین‌پال نیست. روابط مشاهده‌ای را علّی یا پیش‌بینی معرفی نکنید.\n${JSON.stringify(grounding)}`,
      timeout: { totalMs: 25_000 },
    });
    return result.toUIMessageStreamResponse({ onError: () => fallback });
  } catch {
    return fallbackResponse(fallback);
  }
}
