// GET /api/debug-env — temporary diagnostic route. Reports WHETHER each
// expected env var is present and its length, never the actual value.
// Safe to leave briefly, but should be removed once the OpenRouter 401 is
// resolved (no auth on this route — don't leave it up long-term).

import { NextResponse } from "next/server";
import { OpenRouterClient } from "@/lib/parse-cr";

function describe(value: string | undefined) {
  if (value === undefined) return { present: false, length: 0, trimmedLength: 0 };
  return { present: true, length: value.length, trimmedLength: value.trim().length };
}

export async function GET() {
  return NextResponse.json({
    OPENROUTER_API_KEY: describe(process.env.OPENROUTER_API_KEY),
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL ?? null,
    OPENROUTER_MODEL_FALLBACKS: process.env.OPENROUTER_MODEL_FALLBACKS ?? null,
    resolvedFreeModelOrder: process.env.OPENROUTER_API_KEY
      ? new OpenRouterClient(process.env.OPENROUTER_API_KEY.trim())["models"]
      : null,
    ANTHROPIC_API_KEY: describe(process.env.ANTHROPIC_API_KEY),
    GEMINI_API_KEY: describe(process.env.GEMINI_API_KEY),
    DATABASE_URL: describe(process.env.DATABASE_URL),
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
  });
}
