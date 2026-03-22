"use client";

import { Loader2, Sparkles } from "lucide-react";
import React from "react";

import { FindingsFeed } from "@/components/FindingsFeed";
import { MorphPanel } from "@/components/ui/ai-input";
import { Button } from "@/components/ui/button";
import { buildAiDashboardContext } from "@/lib/buildAiContext";
import { cn } from "@/lib/utils";
import { useTelemetryStore } from "@/store/telemetryStore";
import type { ViewMode } from "@/types/telemetry";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
};

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const SUMMARIZE_PROMPT =
  "Give a concise operational summary: site/asset, key telemetry highlights, risk level, recommended action, and open findings. Use bullet lists where helpful.";

export function ContextAiRail({ viewMode }: { viewMode: ViewMode }) {
  /** Slightly dim this rail only in Context tab so Live / Findings stay readable. */
  const dim = viewMode === "context";
  const snapshot = useTelemetryStore((s) => s.displaySnapshot);
  const findings = useTelemetryStore((s) => s.findings);
  const history = useTelemetryStore((s) => s.history);
  const mapViewportMode = useTelemetryStore((s) => s.mapViewportMode);
  const connected = useTelemetryStore((s) => s.connected);
  const runtimeMode = useTelemetryStore((s) => s.runtimeMode);

  const [messages, setMessages] = React.useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      content:
        "I'm connected to your live dashboard context. Ask a question, or tap Summarize for a quick ops brief.",
    },
  ]);
  const [pending, setPending] = React.useState(false);
  const [pendingKind, setPendingKind] = React.useState<"chat" | "summarize">(
    "chat",
  );
  const pendingRef = React.useRef(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const contextString = React.useMemo(
    () =>
      buildAiDashboardContext({
        snapshot,
        findings,
        history,
        mapViewportMode,
        connected,
        runtimeMode,
      }),
    [
      snapshot,
      findings,
      history,
      mapViewportMode,
      connected,
      runtimeMode,
    ],
  );

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  const runChat = React.useCallback(
    async (userText: string, opts?: { silent?: boolean }) => {
      if (pendingRef.current) return;
      pendingRef.current = true;
      const silent = opts?.silent === true;
      const userMsg: ChatMessage = {
        id: newId(),
        role: "user",
        content: userText,
      };
      if (!silent) {
        setMessages((m) => [...m, userMsg]);
      }
      setPendingKind(silent ? "summarize" : "chat");
      setPending(true);
      try {
        const nextThread = [...messages, userMsg].filter(
          (x) => x.role === "user" || x.role === "assistant",
        );
        const forApi = nextThread.filter((m) => m.id !== "welcome");
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: forApi.map(({ role, content }) => ({ role, content })),
            context: contextString,
          }),
        });
        const data = (await res.json()) as { text?: string; error?: string };
        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        setMessages((m) => [
          ...m,
          {
            id: newId(),
            role: "assistant",
            content: data.text?.trim() || "(empty response)",
          },
        ]);
      } catch (e) {
        const err = e instanceof Error ? e.message : "Request failed";
        setMessages((m) => [
          ...m,
          {
            id: newId(),
            role: "assistant",
            content: err,
            error: true,
          },
        ]);
      } finally {
        pendingRef.current = false;
        setPending(false);
      }
    },
    [messages, contextString],
  );

  const onSummarize = React.useCallback(() => {
    void runChat(SUMMARIZE_PROMPT, { silent: true });
  }, [runChat]);

  const findingsMode = viewMode === "findings";

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-[min(320px,32vw)] shrink-0 flex-col gap-2 overflow-hidden border-l border-white/[0.06] bg-void/60 py-3 pl-2 pr-2 backdrop-blur-sm transition-opacity",
        dim ? "opacity-75" : "",
      )}
    >
      {findingsMode ? (
        <div className="flex min-h-0 min-w-0 flex-[3] flex-col overflow-hidden px-1">
          <FindingsFeed
            findings={findings}
            siteContext={{
              site_name: snapshot.site_name,
              duct_section: snapshot.duct_section,
              inspection_id: snapshot.inspection_id,
              asset_id: snapshot.asset_id,
            }}
          />
        </div>
      ) : null}

      <div
        className={cn(
          "flex min-h-0 flex-col gap-2 overflow-hidden",
          findingsMode ? "flex-[2] border-t border-white/[0.06] pt-2" : "min-h-0 flex-1",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
            <p className="micro-label text-dim">Ops AI</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 shrink-0 rounded-md px-2 text-[10px]"
            disabled={pending}
            onClick={onSummarize}
          >
            Summarize
          </Button>
        </div>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-1 pb-1"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "rounded-lg border px-2.5 py-2 text-[11px] leading-relaxed",
                msg.role === "user"
                  ? "border-white/[0.06] bg-panel/90 text-ink/90"
                  : msg.error
                    ? "border-red-500/25 bg-red-950/20 text-red-200/90"
                    : "border-white/[0.06] bg-panel/60 text-ink/85",
              )}
            >
              {msg.role === "user" ? (
                <p className="font-medium text-ink/70">You</p>
              ) : (
                <p className="font-medium text-dim">AeroOps AI</p>
              )}
              <div className="mt-1 whitespace-pre-wrap">{msg.content}</div>
            </div>
          ))}
          {pending ? (
            <div className="text-dim flex items-center gap-2 px-1 text-[10px]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {pendingKind === "summarize" ? "Summarizing…" : "Thinking…"}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-white/[0.06] pt-2">
          <MorphPanel
            onSendMessage={(text) => runChat(text)}
            className="px-0"
          />
          <p className="mt-1.5 px-1 text-center text-[8px] leading-snug text-zinc-600">
            Context refreshes each send. API key stays on the server.
          </p>
        </div>
      </div>
    </aside>
  );
}
