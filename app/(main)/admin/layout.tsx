import { requirePermission } from "@/lib/authz-check.server"
import { PERMISSIONS } from "@/lib/rbac"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePermission(PERMISSIONS.ADMIN.DB_VIEW)

  return <>{children}</>
}
