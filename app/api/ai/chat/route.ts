import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

/** Gemini requires history to start with `user`, never `model`. */
function stripLeadingAssistantMessages(prior: ChatMessage[]): ChatMessage[] {
  let i = 0;
  while (i < prior.length && prior[i].role !== "user") i += 1;
  return prior.slice(i);
}

/** Model aliases rotate; try in order until one responds (404 → next). */
function geminiModelCandidates(explicit?: string): string[] {
  const defaults = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-1.5-flash-002",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
  ];
  const list = explicit ? [explicit, ...defaults] : defaults;
  const seen = new Set<string>();
  return list.filter((m) => {
    if (!m || seen.has(m)) return false;
    seen.add(m);
    return true;
  });
}

function isModelNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("404") ||
    /not found/i.test(msg) ||
    /is not found for API version/i.test(msg) ||
    /no longer available/i.test(msg)
  );
}

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error:
          "GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = (body as { messages?: ChatMessage[] }).messages;
  const context = String((body as { context?: string }).context ?? "");

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array required" }, { status: 400 });
  }

  const last = messages[messages.length - 1];
  if (last.role !== "user" || !String(last.content ?? "").trim()) {
    return NextResponse.json(
      { error: "Last message must be a non-empty user message" },
      { status: 400 },
    );
  }

  const envModel = process.env.GEMINI_MODEL?.trim();
  const candidates = geminiModelCandidates(envModel);

  const systemInstruction = `You are AeroOps AI for HVAC duct inspection / live telemetry dashboards.

How to write answers:
- Use plain, conversational English. Keep answers reasonably short unless the user asks for detail.
- Never echo raw JSON, snake_case keys, or variable names (e.g. say "internal temperature is about 41 °C" not "internal_temp_c: 41.2").
- For questions about readings, risk, findings, or "what's wrong": summarize what the dashboard context supports in normal sentences and short bullets. Give a direct answer first.
- Do not refuse with phrases like "I can't show that", "I cannot display", "I'm not able to", or similar when the DASHBOARD CONTEXT JSON actually contains related fields — use those values and explain them simply.
- If something truly is not in the JSON, say what you can report from the data in one brief sentence instead of apologizing at length.

Accuracy:
- Base numbers and claims only on DASHBOARD CONTEXT. Do not invent incidents, sensors, or findings that are not represented there.

--- DASHBOARD CONTEXT (JSON) ---
${context || "{}"}`;

  const prior = stripLeadingAssistantMessages(messages.slice(0, -1));
  const history = prior.map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: m.content }],
  }));

  const genAI = new GoogleGenerativeAI(key);
  let lastErr: unknown;

  for (const modelName of candidates) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
      });
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(last.content);
      const text = result.response.text();
      return NextResponse.json({ text });
    } catch (e) {
      lastErr = e;
      if (isModelNotFoundError(e)) {
        console.warn(`[api/ai/chat] model ${modelName} unavailable, trying next…`);
        continue;
      }
      console.error("[api/ai/chat]", e);
      const msg =
        e instanceof Error ? e.message : "Gemini request failed. Check model name and API key.";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  console.error("[api/ai/chat] all models failed", lastErr);
  const msg =
    lastErr instanceof Error
      ? lastErr.message
      : "No working Gemini model found. Set GEMINI_MODEL in .env.local to an id from https://ai.google.dev/gemini-api/docs/models";
  return NextResponse.json({ error: msg }, { status: 500 });
}
