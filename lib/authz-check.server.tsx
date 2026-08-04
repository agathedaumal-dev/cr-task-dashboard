import "server-only";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import type { ReactNode } from "react";
import { env } from "@/lib/env";
import { 
  hasPermission,
  hasAnyPermission,
  extractRoleFromMetadata,
  type Permission, 
  type Role 
} from "./rbac";

// ─── Core Helpers ─────────────────────────────────────────────────────────────

/**
 * Retrieves and VALIDATES the current role.
 * Fails safely (returns null) if the role in the token is invalid or missing.
 */
async function getRole(): Promise<Role | null> {
  const { sessionClaims } = await auth();
  
  // Extract role from the custom claim using shared helper
  const publicMetadata =
    (sessionClaims?.metadata ?? {}) as Record<string, unknown>;
  const appIdentifier = env.APP_IDENTIFIER;
  
  return appIdentifier
    ? extractRoleFromMetadata(publicMetadata, appIdentifier)
    : null;
}

// ─── Server Components & Server Actions ──────────────────────────────────────

/**
 * Enforces a permission check. Redirects if failed.
 * Use inside Page components or Server Actions.
 */
export async function requirePermission(
  permission: Permission,
  redirectTo = "/forbidden"
): Promise<void> {
  const role = await getRole();

  if (!role || !hasPermission(role, permission)) {
    redirect(redirectTo);
  }
}

/**
 * Enforces a permission check for ANY of the given permissions. Redirects if failed.
 * Use inside Page components or Server Actions when multiple permissions grant access.
 */
export async function requireAnyPermission(
  permissions: Permission[],
  redirectTo = "/forbidden"
): Promise<void> {
  const role = await getRole();

  if (!role || !hasAnyPermission(role, permissions)) {
    redirect(redirectTo);
  }
}

/**
 * Returns boolean status.
 * Use for conditional rendering (e.g., showing/hiding an "Admin" button).
 */
export async function checkPermission(permission: Permission): Promise<boolean> {
  const role = await getRole();
  return !!role && hasPermission(role, permission);
}

// ─── Server Component ────────────────────────────────────────────────────────

interface PermissionGuardProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders `children` if the user has the required permission.
 * @example
 * <PermissionGuard permission={PERMISSIONS.FEATURE_A.WRITE} fallback={<AccessDenied />}>
 * <EditButton />
 * </PermissionGuard>
 */
export async function PermissionGuard({ 
  permission, 
  children, 
  fallback = null 
}: PermissionGuardProps): Promise<ReactNode> {
  const canAccess = await checkPermission(permission);
  return canAccess ? children : fallback;
}

// ─── Route Handlers (API) ────────────────────────────────────────────────────

/**
 * Higher-Order Function to protect Route Handlers.
 * Passes through `params` (context) correctly.
 * @example
 * export const GET = withPermission(PERMISSIONS.FEATURE_A.READ, 
 * async (req, { params }) => { ... }
 * );
 */
export function withPermission<Args extends any[]>(
  permission: Permission,
  handler: (req: NextRequest, ...args: Args) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest, ...args: Args): Promise<NextResponse> => {
    const role = await getRole();

    if (!role) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    if (!hasPermission(role, permission)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return handler(req, ...args);
  };
}