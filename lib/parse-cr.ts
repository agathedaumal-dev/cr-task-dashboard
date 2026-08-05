// Parses a raw Granola CR (EN/FR/ES) into structured task candidates via Gemini.
// The LLM call is behind a small interface so this file can be unit-tested with
// a mock implementation (see scripts/test-parse-local.mjs) without a live API key.

export type ProductId = "carbon-comp-fr" | "carbon-comp-sp" | "carbon-comp-it" | "mrh";
export type Priority = "High" | "Medium" | "Low";
export type Language = "en" | "fr" | "es";

export interface ParsedTaskCandidate {
  title: string;
  assigneeName: string; // "Me" or the attendee's name as written in the CR
  dueDate: string | null; // ISO date, or null if not stated (renders as "TBD")
  priority: Priority; // defaults to "Medium" if not inferable
  rationale: string; // short note on why this was extracted, for the review step
}

export interface ParseCrInput {
  rawText: string;
  title: string;
  meetingDate: string; // ISO date
  attendees: string[];
  language: Language;
}

export interface ParseCrOutput {
  tasks: ParsedTaskCandidate[];
}

// --- LLM call abstraction -----------------------------------------------

export interface LlmClient {
  generateJson(prompt: string): Promise<unknown>;
}

const SYSTEM_PROMPT = `You are extracting action items from a meeting note (Compte Rendu / CR).
The note may be in English, French, or Spanish. Extract every concrete action item.
For each one, determine:
- title: a short, clear description of the action (translate to English for consistency)
- assigneeName: "Me" if the note's author/user owns the action, otherwise the exact
  attendee name as it appears in the note
- dueDate: an ISO 8601 date (YYYY-MM-DD) if a date or relative timeframe is stated
  (e.g. "by Friday", "next week" -> resolve relative to the meeting date), otherwise null
- priority: "High", "Medium", or "Low" — infer from urgency language, default "Medium"
- rationale: one short sentence quoting or paraphrasing the source line

Return ONLY valid JSON matching: { "tasks": [ { "title": string, "assigneeName": string,
"dueDate": string | null, "priority": "High"|"Medium"|"Low", "rationale": string } ] }`;

export function buildPrompt(input: ParseCrInput): string {
  return [
    SYSTEM_PROMPT,
    "",
    `Meeting title: ${input.title}`,
    `Meeting date: ${input.meetingDate}`,
    `Attendees: ${input.attendees.join(", ")}`,
    `Language: ${input.language}`,
    "",
    "--- CR TEXT ---",
    input.rawText,
  ].join("\n");
}

export async function parseCr(input: ParseCrInput, llm: LlmClient): Promise<ParseCrOutput> {
  const prompt = buildPrompt(input);
  const raw = await llm.generateJson(prompt);
  return normalizeParseOutput(raw);
}

// Defensive normalization — LLM JSON output should match, but never trust it blindly.
export function normalizeParseOutput(raw: unknown): ParseCrOutput {
  const obj = raw as { tasks?: unknown[] };
  const tasks: ParsedTaskCandidate[] = Array.isArray(obj?.tasks)
    ? obj.tasks.map((t) => {
        const task = t as Partial<ParsedTaskCandidate>;
        return {
          title: String(task.title ?? "").trim() || "Untitled action item",
          assigneeName: String(task.assigneeName ?? "Me").trim() || "Me",
          dueDate: task.dueDate ? String(task.dueDate) : null,
          priority: (["High", "Medium", "Low"].includes(task.priority as string)
            ? task.priority
            : "Medium") as Priority,
          rationale: String(task.rationale ?? "").trim(),
        };
      })
    : [];
  return { tasks };
}

// --- Real Gemini client (used in production; requires GEMINI_API_KEY) ---
// Wire this up once the app is deployed on Paper Vibes and GEMINI_API_KEY is
// set. Uses the Gemini API's JSON response mode.
export class GeminiClient implements LlmClient {
  constructor(private apiKey: string, private model = "gemini-3.5-flash-lite") {}

  async generateJson(prompt: string): Promise<unknown> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );
    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    return JSON.parse(text);
  }
}

// --- Anthropic (Claude) client — alternative to Gemini ---
// Use this if a Gemini key isn't obtainable (e.g. Google Cloud project creation is
// locked down by your org's Workspace policy). Get a key at https://console.anthropic.com
// — no Cloud project concept, works with any email.
export class AnthropicClient implements LlmClient {
  constructor(private apiKey: string, private model = "claude-haiku-4-5-20251001") {}

  async generateJson(prompt: string): Promise<unknown> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((c) => c.type === "text")?.text ?? "{}";
    // Claude may wrap JSON in prose or a code fence despite instructions — extract the
    // first {...} block defensively.
    const match = text.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : text);
  }
}

// Picks whichever provider has a configured key. Prefers Anthropic since it's the
// easier self-service path (no Google Cloud project required).
export function getConfiguredLlmClient(): LlmClient {
  // .trim() guards against copy-paste whitespace/newlines in env var values
  // (a real cause of "Missing Authentication header" style 401s — the key
  // looks present but the actual header value is corrupted).
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (openrouterKey) {
    return new OpenRouterClient(openrouterKey);
  }
  if (anthropicKey) {
    return new AnthropicClient(anthropicKey);
  }
  if (geminiKey) {
    return new GeminiClient(geminiKey);
  }
  throw new Error(
    "No LLM configured — set OPENROUTER_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY"
  );
}

// --- OpenRouter client — another self-service option ---
// OpenRouter (https://openrouter.ai) isn't tied to papernest's Google Workspace or
// Anthropic's enterprise domain claim, so email/password signup with a work email
// should work without hitting an org/SSO wall. OpenAI-compatible API.
//
// Runs a list of FREE models in order, falling through to the next one on rate
// limits (429), "model not found" (404), or upstream server errors (5xx) — free
// shared pools get congested, so at 1-10 CRs/day this keeps things working
// without needing a paid key. Auth errors (401) are NOT retried across models
// since they'd fail identically everywhere.
const DEFAULT_FREE_MODELS = [
  "google/gemma-4-31b-it:free",
  "openai/gpt-oss-20b:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
];

// 12s was too short for free-tier OpenRouter models (shared/queued capacity can
// legitimately take 15-30s) AND timeouts weren't being retried across models at
// all (see retryableOnNextModel below in the previous version) — a slow model
// #1 killed the whole request instead of falling through to #2-4.
const PER_MODEL_TIMEOUT_MS = 20_000;

// Overall wall-clock budget across ALL model attempts combined, so a chain of
// timeouts can't exceed Vercel's function maxDuration (set to 60s on the two
// routes that call parseCr — see app/api/cr/parse/route.ts and
// app/api/cr/webhook/route.ts). Leaves buffer for JSON parsing / response.
const OVERALL_BUDGET_MS = 50_000;
// Don't start a new model attempt if less than this much budget remains — an
// attempt that's guaranteed to be killed mid-flight just wastes time and
// produces a confusing error instead of a clean "ran out of time" message.
const MIN_BUDGET_TO_ATTEMPT_MS = 5_000;

function resolveModelList(): string[] {
  const fallbackList = process.env.OPENROUTER_MODEL_FALLBACKS?.trim();
  if (fallbackList) {
    return fallbackList.split(",").map((m) => m.trim()).filter(Boolean);
  }
  const single = process.env.OPENROUTER_MODEL?.trim();
  if (single) {
    return [single, ...DEFAULT_FREE_MODELS.filter((m) => m !== single)];
  }
  return DEFAULT_FREE_MODELS;
}

export class OpenRouterClient implements LlmClient {
  private models: string[];

  constructor(private apiKey: string, models?: string[]) {
    this.models = models ?? resolveModelList();
  }

  async generateJson(prompt: string): Promise<unknown> {
    const errors: string[] = [];
    const startedAt = Date.now();

    for (const model of this.models) {
      const remaining = OVERALL_BUDGET_MS - (Date.now() - startedAt);
      if (remaining < MIN_BUDGET_TO_ATTEMPT_MS) {
        errors.push(`${model}: skipped — only ${Math.max(remaining, 0)}ms left in overall budget`);
        break;
      }

      try {
        return await this.callModel(model, prompt, Math.min(PER_MODEL_TIMEOUT_MS, remaining));
      } catch (e) {
        const msg = (e as Error).message;
        errors.push(`${model}: ${msg}`);
        // Timeouts are retryable (a slow/congested free model shouldn't kill the
        // whole request), same as rate limits, not-found, and server errors.
        // Only real auth failures (401) short-circuit, since they'd fail
        // identically against every model.
        const isAuthError = /\b401\b/.test(msg);
        if (isAuthError) {
          throw new Error(`OpenRouter request failed (not retrying further models): ${msg}`);
        }
        // else: fall through and try the next model in the list
      }
    }
    throw new Error(
      `All ${this.models.length} configured free model(s) failed within ${OVERALL_BUDGET_MS}ms budget:\n${errors.join("\n")}`
    );
  }

  private async callModel(model: string, prompt: string, timeoutMs: number): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`OpenRouter API error: ${res.status} ${await res.text()}`);
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content ?? "{}";
      // Some models route through OpenRouter without honoring response_format
      // strictly and wrap JSON in prose or a markdown code fence — extract the
      // first {...} block defensively, same as the Anthropic client above.
      const match = text.match(/\{[\s\S]*\}/);
      return JSON.parse(match ? match[0] : text);
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        throw new Error(`timed out after ${timeoutMs}ms`);
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }
  }
}
