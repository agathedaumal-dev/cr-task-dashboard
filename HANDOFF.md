# Handoff notes — CR Task Dashboard

Context for picking this project back up in Claude Code (or for a fresh Claude session).

## What this is
A personal dashboard that turns Granola meeting notes (EN/FR/ES) into three views:
My To-Do (bucketed by due date), Interlocutor Hub (per-stakeholder follow-ups, 3
categories: I owe them / they owe me / we follow together), and 4 Product Hubs
(Carbon Comp FR/SP/IT, MRH).

## Stack
- Next.js 16 (App Router, Turbopack), originally from papernest's internal
  "Paper Vibes" template — now deployed standalone on **Vercel** (papernest's
  own CI/secrets pipeline got stuck for this brand-new app and couldn't be
  diagnosed or fixed without DevOps access, so this repo is a from-scratch
  Vercel deployment instead).
- **Auth: none right now.** Removed papernest's shared Clerk (not configured
  for external domains) — the live app is unauthenticated. Worth adding
  something (Vercel password protection, or a simple env-var-based gate)
  before storing anything sensitive long-term.
- DB: Postgres via Neon (external, free tier), Drizzle ORM. `lib/db.ts`
  returns `null` if `DATABASE_URL` isn't set — every page/route guards with
  `if (db)` and falls back to mock data.
- LLM: OpenRouter (`lib/parse-cr.ts` `getConfiguredLlmClient()` — checks
  `OPENROUTER_API_KEY` first, then `ANTHROPIC_API_KEY`, then `GEMINI_API_KEY`).
  Google AI Studio and Anthropic Console were both blocked by papernest's
  Workspace/domain SSO policies, which is why OpenRouter is primary.

## Environment variables (set in Vercel → Settings → Environment Variables)
- `DATABASE_URL` — Neon pooled connection string
- `OPENROUTER_API_KEY` — from openrouter.ai

## Data model (`db/schema/index.ts`)
`interlocutors`, `meeting_crs`, `cr_tasks` (Drizzle/Postgres). `cr_tasks.type`
enum is `my-todo | i-owe-them | they-owe-me | we-follow-together`.

**Known gap**: `they-owe-me` was added to the enum in code after the DB was
already created from an earlier migration. If the live app still errors or the
Interlocutor Hub's "What they owe me" column looks broken, check whether this
was run in Neon's SQL editor:
```sql
ALTER TYPE "public"."task_type" ADD VALUE 'they-owe-me';
```

## Ingestion
- `app/api/cr/parse/route.ts` — manual paste (works today)
- `app/api/cr/webhook/route.ts` — Granola → Zapier webhook receiver. Field
  names (`meeting_title`, `attendees`, `notes`, etc.) are **best-guess**,
  never confirmed against a real Zapier payload. Send one test event and
  adjust the destructuring before trusting it.
- `app/api/tasks/[id]/route.ts` — PATCH endpoint for manual edits (status,
  priority, dueDate, type, title) — wired into My To-Do's checkbox/date/priority
  controls.

## Outstanding / not yet verified
1. **Live DB connectivity was unconfirmed as of this handoff** — the deployed
   app was still showing mock data after `DATABASE_URL` was added in Vercel.
   Most likely cause: the env var wasn't scoped to "Production," or was added
   after the last build. Check this first.
2. `they-owe-me` enum migration (see above).
3. No seed data for `interlocutors` — the 10-15 real stakeholders haven't been
   entered into the `interlocutors` table yet. Either insert manually in Neon's
   SQL editor or build a small settings page for it.
4. Granola webhook field mapping unconfirmed (see Ingestion above).
5. No auth (see Stack above) — flagged, not blocking.

## Local dev
```bash
npm install
npm run dev
```
No Docker needed unless you want a local Postgres — it'll run fine against the
same Neon `DATABASE_URL` directly, or with no `DATABASE_URL` at all (mock-data
mode, matches what's on Vercel's Preview deployments without env vars).
