import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { extractRoleFromMetadata, hasPermission, PERMISSIONS } from "./lib/rbac";

const isAuthOnlyRoute = createRouteMatcher(["/unauthorized"]);

// Public routes are explicitly whitelisted; everything else is protected.
// /api/health is the platform's unauthenticated probe — also excluded from the
// matcher below so the middleware never runs for it (belt-and-suspenders).
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health(.*)"
]);

// Example of a route requiring specific permissions
const isAdminRoute = createRouteMatcher(["/admin-dashboard(.*)"]);

export default clerkMiddleware(
  async (auth, request) => {
    if (isPublicRoute(request)) {
      return NextResponse.next();
    }
    const { userId, sessionClaims } = await auth();

    // SECURITY: deny-by-default. Any request that is not explicitly public
    // must have a valid Clerk session, otherwise it will be blocked/redirected.
    if (!userId) {
      await auth.protect();
      return NextResponse.next();
    }
    if (isAuthOnlyRoute(request)) {
      return NextResponse.next();
    }
    const publicMetadata =
      (sessionClaims?.metadata ?? {}) as Record<string, unknown>;
    const appIdentifier = env.APP_IDENTIFIER;
    const isAuthorized = appIdentifier
      ? Object.prototype.hasOwnProperty.call(publicMetadata, appIdentifier)
      : false;

    if (!isAuthorized) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    if (isAdminRoute(request)) {
      const role = extractRoleFromMetadata(publicMetadata, appIdentifier);
      if (!role || !hasPermission(role, PERMISSIONS.FEATURE_B.READ)) {
        return NextResponse.redirect(new URL("/unauthorized", request.url)); 
      }
    }

    return NextResponse.next();
  },
  {
    // @clerk/nextjs does not auto-read CLERK_JWT_KEY from env — must be passed explicitly.
    // This enables local JWT verification instead of a Backend API round-trip.
    jwtKey: env.CLERK_JWT_KEY,
    contentSecurityPolicy: {
      strict: true,
    },
  },
);

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and the platform health probe (/api/health
    // must return 200 without auth even before Clerk env is set — see DEVOPS-5495).
    "/((?!api/health|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes EXCEPT the unauthenticated /api/health probe.
    "/(api(?!/health)|trpc)(.*)"
  ]
};
