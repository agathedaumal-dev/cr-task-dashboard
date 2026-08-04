import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Simplified for the standalone Vercel deployment: this app doesn't use
// papernest's shared Clerk instance (it isn't configured for external
// domains), so auth-related vars are gone. Only DB + LLM keys matter here.
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url().optional(),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    OPENROUTER_API_KEY: z.string().min(1).optional(),
    GEMINI_API_KEY: z.string().min(1).optional(),
  },
  client: {},
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
  emptyStringAsUndefined: true,
});
