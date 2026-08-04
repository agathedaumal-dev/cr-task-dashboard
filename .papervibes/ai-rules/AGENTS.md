## Stack
Next.js 15 App Router · TypeScript strict · Clerk auth · Tailwind v4 + Shadcn/UI · Drizzle ORM + PostgreSQL · Zod

## Conventions
- Named exports only — exceptions: `page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`
- Server Components by default; `"use client"` only for hooks/browser APIs
- Tailwind v4 uses CSS-based config — no `tailwind.config.ts`, no `theme.extend`
- All env vars via `lib/env.ts` — never read `process.env` directly; register new vars there with Zod
- Business logic lives in `lib/` (shared utilities) or `components/features/` (domain components) — there is no `features/` directory

## Auth & Security
- Routing security lives in `proxy.ts` — **never create `middleware.ts`**
- `CLERK_SECRET_KEY` must stay `INTENTIONALLY_INVALID_DO_NOT_REPLACE` — never replace it
- Never call `clerkClient` or `currentUser()` — use `auth()` from `@clerk/nextjs/server` only
- Permissions defined in `lib/rbac.ts`; enforced via `lib/authz-check.server.tsx` — never hardcode permission strings
- **Scope every DB query to the current user.** A passing `checkPermission()` means the *role* is allowed — not that the user owns the row. Filter by the authenticated user's ID; never trust a client-supplied ID to be theirs (IDOR).
- **Never write whole parsed input to the DB.** Only persist fields the user is allowed to set — never let `role`, `userId`, `price`, or similar ride in from the form (mass assignment).
- **Keep secrets server-side.** Only non-sensitive values get `NEXT_PUBLIC_`; never import server code or secrets into a `"use client"` component.
- **Never expose PII or raw errors** to the user or logs — return generic messages; don't echo input back.

## Commands
`npm run dev` · `npm run build` · `npm run lint` · DB: `npm run db:generate` → `db:migrate`
Before declaring work done, run `npm run lint` and `npm run build` and fix what breaks — the user can't verify it for you.

## Server Actions
Order: `auth()` → rate limit (`isRateLimited`) → `checkPermission()` → `try { safeParse() → db call } catch { logError() }` → return `{ success, message, data?, error? }`. Surface errors to the user via `toast.error(result.message)` from sonner.

## Database
Schema in `db/schema/index.ts`. `db` from `lib/db.ts` can be `null` when `DATABASE_URL` is unset — guard before use.

## Hard Rules
- Never hardcode secrets, tokens, or credentials — env vars only
- No hallucinated packages — check `package.json` before any import; solve with installed packages before proposing new dependencies
- No `any` — use `unknown` + narrowing, or define an interface
- For changes to `proxy.ts`, `lib/rbac.ts`, `lib/authz-check.server.tsx`, `db/schema/`, or env vars: state your plan, wait for confirmation