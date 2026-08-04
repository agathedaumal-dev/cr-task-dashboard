// Unauthenticated liveness/readiness probe for the ai-innovation platform.
//
// Intentionally imports NOTHING (no @/lib/env, no Clerk): lib/env.ts hard-validates
// the Clerk env vars and throws when they're absent, which would 500 the pod and block
// the rollout (see DEVOPS-5495). This route is also excluded from the Clerk middleware
// matcher in proxy.ts, so it returns 200 even before Clerk is configured.
//
// The platform points its probes here via infra_platform/platform.yaml `healthPath`.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok" }, { status: 200 });
}
