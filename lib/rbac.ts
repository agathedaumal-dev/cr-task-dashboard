import "server-only";

/**
 * Single source of truth for all permission strings.
 * Naming convention: domain:resource:action
 * * TODO (Template User): Replace FEATURE_A and FEATURE_B with your actual app domains 
 * (e.g., USERS, BILLING, DASHBOARD).
 */
export const PERMISSIONS = {
  FEATURE_A: {
    READ: "feature_a:data:read",
    WRITE: "feature_a:data:write",
  },
  FEATURE_B: {
    READ: "feature_b:data:read",
  },
  ADMIN: {
    DB_VIEW: "admin:db:read",
  },
} as const;
  
/**
 * Auto-derived from PERMISSIONS — no manual update needed when adding domains.
 * This ensures strict type safety across the entire application.
 */
type DeepValues<T> = T extends Record<string, infer V> ? DeepValues<V> : T;
export type Permission = DeepValues<typeof PERMISSIONS>;

/**
 * Baseline Application Roles
 * TODO (Template User): Adjust these roles if your app requires different baseline access levels.
 */
export type Role = "user" | "manager" | "admin";

/**
 * Explicit permission lists per role.
 * Best Practice: List lower-level permissions explicitly even if higher-level 
 * access is granted. This keeps `hasPermission` as a fast O(N) array inclusion check.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  user: [
    PERMISSIONS.FEATURE_A.READ,
  ],
  manager: [
    PERMISSIONS.FEATURE_A.READ,
    PERMISSIONS.FEATURE_A.WRITE,
    PERMISSIONS.FEATURE_B.READ,
  ],
  admin: [
    PERMISSIONS.FEATURE_A.READ,
    PERMISSIONS.FEATURE_A.WRITE,
    PERMISSIONS.FEATURE_B.READ,
    PERMISSIONS.ADMIN.DB_VIEW,
  ],
} as const;

/**
 * Returns true if the given role has the given permission.
 * Returns false if the role is unknown or doesn't have the permission.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role];
  if (!rolePermissions) {
    return false;
  }
  return (rolePermissions as readonly string[]).includes(permission);
}

/**
 * Returns true if the given role has ALL of the given permissions.
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Returns true if the given role has ANY of the given permissions.
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Returns all permissions assigned to a role.
 * Returns an empty array if the role is unknown.
 */
export function getPermissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Extracts and validates a role from Clerk session metadata.
 * * This is the single source of truth for role extraction logic.
 * Reads from `metadata[appIdentifier].role` and validates against ROLE_PERMISSIONS.
 * * @param metadata - The publicMetadata object from Clerk session claims
 * @param appIdentifier - The app identifier key to look up in metadata
 * @returns The validated Role if found and valid, null otherwise
 */
export function extractRoleFromMetadata(
  metadata: Record<string, unknown>,
  appIdentifier: string
): Role | null {
  const candidateRole = (metadata[appIdentifier] as { role?: string } | undefined)?.role;
  
  // Validate role exists in our RBAC configuration
  if (candidateRole && candidateRole in ROLE_PERMISSIONS) {
    return candidateRole as Role;
  }
  
  return null;
}