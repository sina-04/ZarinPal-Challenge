"use client";

import { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { BotIcon, RefreshCcwIcon, ShieldCheckIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai-elements/sources";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractSourceIds } from "@/lib/source-ids";
import { useHydrated } from "@/hooks/use-hydrated";

const suggestedQuestions = [
  "مهم‌ترین اقدام این هفته چیست؟",
  "بازیابی تلاش مجدد چه اثری داشته؟",
  "سناریوی فرصت چگونه حساب شده؟",
];

const sourceLabel: Record<string, string> = {
  verified_session_rate: "نرخ تکمیل",
  rescued_sessions: "بازیابی تلاش مجدد",
  paid_not_verified_rate: "Paid بدون Verified",
};

export function Analyst() {
  const hydrated = useHydrated();
  const searchParams = useSearchParams();
  const merchantKey = searchParams.get("merchant_key") ?? "M43";
  const from = searchParams.get("from") ?? "2026-01-01";
  const to = searchParams.get("to") ?? "2026-02-28";
  const [input, setInput] = useState("");
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { merchant_key: merchantKey, from, to },
      }),
    [from, merchantKey, to],
  );
  const { messages, sendMessage, status, stop, regenerate, error, clearError } = useChat({ transport });
  const errorFallback = error?.message.includes("پاسخ قطعی بر پایه شواهد ثبت‌شده")
    ? error.message
    : null;
  const errorSourceIds = [...new Set(extractSourceIds(errorFallback ?? ""))];

  const submit = (message: PromptInputMessage) => {
    const text = message.text.trim();
    if (!text) return;
    void sendMessage({ text });
    setInput("");
  };

  return (
    <Card className="analyst-card" data-hydrated={hydrated} data-testid="ai-analyst">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-kicker">توضیح هوشمند، محاسبه قطعی</p>
            <CardTitle className="mt-1">تحلیل‌گر نبض زرین</CardTitle>
          </div>
          <Badge variant="outline"><ShieldCheckIcon aria-hidden="true" /> محدود به شواهد {merchantKey}</Badge>
        </div>
      </CardHeader>
      <CardContent className="analyst-layout">
        <Conversation className="min-h-0">
          <ConversationContent className="px-1">
            {messages.length === 0 ? (
              <ConversationEmptyState
                description="پاسخ فقط از شاخص‌ها و شواهد ثبت‌شده این پذیرنده ساخته می‌شود."
                icon={<BotIcon aria-hidden="true" />}
                title="یک تصمیم تجاری را بررسی کنید"
              >
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {suggestedQuestions.map((question) => (
                    <Button key={question} onClick={() => setInput(question)} size="sm" variant="outline">
                      {question}
                    </Button>
                  ))}
                </div>
              </ConversationEmptyState>
            ) : (
              messages.map((message, messageIndex) => {
                const assistantText = message.parts
                  .filter((part) => part.type === "text")
                  .map((part) => part.text)
                  .join(" ");
                const sourceIds = [...new Set(extractSourceIds(assistantText))];
                return (
                <div key={message.id}>
                  <Message from={message.role}>
                    <MessageContent>
                      {message.parts.map((part, partIndex) => {
                        if (part.type !== "text") return null;
                        const fallback = part.text.includes("پاسخ قطعی بر پایه شواهد ثبت‌شده");
                        return (
                          <div data-testid={fallback ? "ai-fallback" : undefined} key={`${message.id}-${partIndex}`}>
                            <MessageResponse>{part.text}</MessageResponse>
                          </div>
                        );
                      })}
                    </MessageContent>
                  </Message>
                  {message.role === "assistant" ? (
                    <>
                      {sourceIds.length > 0 ? (
                        <Sources>
                          <SourcesTrigger count={sourceIds.length}>
                            منابع محاسباتی
                          </SourcesTrigger>
                          <SourcesContent>
                            {sourceIds.map((sourceId) => {
                              const metricId = sourceId.includes("--")
                                ? sourceId.split("--")[1]
                                : sourceId;
                              return (
                                <Source
                                  href={`/evidence?merchant_key=${encodeURIComponent(merchantKey)}&from=${from}&to=${to}#${encodeURIComponent(metricId)}`}
                                  key={sourceId}
                                  title={sourceId}
                                >
                                  {sourceLabel[metricId] ?? metricId} · {sourceId}
                                </Source>
                              );
                            })}
                          </SourcesContent>
                        </Sources>
                      ) : null}
                      {messageIndex === messages.length - 1 ? (
                        <MessageActions>
                          <MessageAction label="تلاش دوباره" onClick={() => void regenerate()} tooltip="تلاش دوباره">
                            <RefreshCcwIcon aria-hidden="true" />
                          </MessageAction>
                        </MessageActions>
                      ) : null}
                    </>
                  ) : null}
                </div>
                );
              })
            )}
          </ConversationContent>
          <ConversationScrollButton aria-label="رفتن به تازه‌ترین پیام" />
        </Conversation>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>
              {errorFallback ? "پاسخ قطعی جایگزین شد" : "پاسخ هوشمند دریافت نشد"}
            </AlertTitle>
            <AlertDescription>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p data-testid={errorFallback ? "ai-fallback" : undefined}>
                  {errorFallback ??
                    "محاسبه‌های داشبورد همچنان معتبرند. دوباره تلاش کنید؛ هیچ عدد پذیرنده دیگری جایگزین نشده است."}
                </p>
                <Button onClick={clearError} size="sm" variant="outline">بستن خطا</Button>
              </div>
              {errorSourceIds.length > 0 ? (
                <Sources className="mt-3">
                  <SourcesTrigger count={errorSourceIds.length}>منابع پاسخ قطعی</SourcesTrigger>
                  <SourcesContent>
                    {errorSourceIds.map((sourceId) => (
                      <Source
                        href={`/evidence?merchant_key=${encodeURIComponent(merchantKey)}&from=${from}&to=${to}#${encodeURIComponent(sourceId)}`}
                        key={sourceId}
                        title={sourceId}
                      >
                        {sourceLabel[sourceId] ?? sourceId}
                      </Source>
                    ))}
                  </SourcesContent>
                </Sources>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        <PromptInput className="analyst-prompt" onSubmit={submit}>
          <PromptInputBody>
            <PromptInputTextarea
              aria-label="پرسش از تحلیل‌گر"
              maxLength={600}
              onChange={(event) => setInput(event.currentTarget.value)}
              placeholder="مثلاً چرا بازیابی تلاش مجدد مهم است؟"
              value={input}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <span className="text-xs text-muted-foreground">حداکثر ۶۰۰ نویسه</span>
            </PromptInputTools>
            <PromptInputSubmit
              aria-label="ارسال پرسش"
              disabled={!input.trim() && status === "ready"}
              onStop={stop}
              status={status}
            />
          </PromptInputFooter>
        </PromptInput>
      </CardContent>
    </Card>
  );
}
