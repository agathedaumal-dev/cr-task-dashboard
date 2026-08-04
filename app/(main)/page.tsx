import { db } from "@/lib/db"
import { tickets, users } from "@/db/schema"
import { desc, eq } from "drizzle-orm"
import { Typography } from "@/components/ui/typography"
import { Button } from "@/components/ui/button"
import { NotificationCenter } from "@/components/dashboard/notification-center"
import { DashboardActions } from "@/components/dashboard/dashboard-actions"
import { PermissionGuard } from "@/lib/authz-check.server"
import { PERMISSIONS } from "@/lib/rbac"
import { appConfig } from "@/lib/app-config"
import { Users, AlertCircle, CheckCircle2, FileText, Database } from "lucide-react"
import Link from "next/link"

type RecentTicket = {
  ticketId: string
  title: string
  userEmail: string
  createdAt: Date
}

const MOCK_ACTIVITY: RecentTicket[] = [
  {
    ticketId: "REQ-001",
    title: "Updated client profile",
    userEmail: "alice@example.com",
    createdAt: new Date(Date.now() - 2 * 60 * 1000),
  },
  {
    ticketId: "REQ-002",
    title: "Exported annual report",
    userEmail: "mark@example.com",
    createdAt: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    ticketId: "REQ-003",
    title: "Daily backup",
    userEmail: "system@example.com",
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
  },
  {
    ticketId: "REQ-004",
    title: "Login attempt failed",
    userEmail: "sarah@example.com",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
]

export default async function DashboardPage() {
  // Fetch recent tickets from the database if DATABASE_URL is configured.
  // Falls back to mock data so the page works without a database.
  let recentTickets: RecentTicket[] = MOCK_ACTIVITY
  let isUsingDb = false

  if (db) {
    recentTickets = await db
      .select({
        ticketId: tickets.ticketId,
        title: tickets.title,
        userEmail: users.email,
        createdAt: tickets.createdAt,
      })
      .from(tickets)
      .innerJoin(users, eq(tickets.userId, users.id))
      .orderBy(desc(tickets.createdAt))
      .limit(10)
    isUsingDb = true
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <Typography
          as="span"
          variant="body"
          size="s"
          weight="medium"
          className="text-muted-foreground"
        >
          {appConfig.appName} /
        </Typography>
        <Typography
          as="span"
          variant="body"
          size="s"
          weight="medium"
          className="ml-1 text-foreground"
        >
          Home
        </Typography>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Typography
            as="h1"
            variant="title"
            size="l"
            weight="book"
            className="tracking-tight text-foreground"
          >
            Overview
          </Typography>
          <Typography
            as="p"
            variant="body"
            size="m"
            weight="medium"
            className="mt-1 text-muted-foreground"
          >
            Welcome back! Here is what&apos;s happening today.
          </Typography>
        </div>
        <div className="flex items-center gap-3">
          <PermissionGuard permission={PERMISSIONS.ADMIN.DB_VIEW}>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/db">
                <Database className="h-4 w-4" />
                DB Admin
              </Link>
            </Button>
          </PermissionGuard>
          <DashboardActions />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Requests"
          value="1,284"
          change="+12% from last month"
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
        />
        <KpiCard
          title="Active Users"
          value="342"
          change="+3 new users today"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <KpiCard
          title="System Uptime"
          value="99.9%"
          change="All systems operational"
          icon={<CheckCircle2 className="h-4 w-4 text-success" />}
        />
        <KpiCard
          title="Pending Issues"
          value="7"
          change="Requires attention"
          icon={<AlertCircle className="h-4 w-4 text-error" />}
        />
      </div>

      {/* NotificationCenter is a Client Component — handles toasts and the error boundary trigger */}
      <NotificationCenter />

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/50 flex items-center justify-between">
          <Typography as="h3" variant="title" size="s" weight="book">
            Recent Activity
          </Typography>
          {isUsingDb ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5">
              <Database className="h-3 w-3 text-success" />
              <Typography
                as="span"
                variant="caption"
                size="s"
                weight="medium"
                className="text-success"
              >
                Live from DB
              </Typography>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5">
              <Database className="h-3 w-3 text-muted-foreground" />
              <Typography
                as="span"
                variant="caption"
                size="s"
                weight="medium"
                className="text-muted-foreground"
              >
                Mock data — set DATABASE_URL to connect
              </Typography>
            </span>
          )}
        </div>
        <div className="p-0">
          {recentTickets.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <Typography
                as="p"
                variant="body"
                size="s"
                weight="medium"
                className="text-muted-foreground"
              >
                No tickets yet. Click &quot;Simulate Server Action&quot; above
                to create one.
              </Typography>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b">
                <tr>
                  {["ID", "Title", "User", "Date"].map((header) => (
                    <th key={header} className="px-6 py-3">
                      <Typography
                        as="span"
                        variant="caption"
                        size="s"
                        weight="book"
                        className="uppercase text-muted-foreground"
                      >
                        {header}
                      </Typography>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentTickets.map((ticket) => (
                  <tr
                    key={ticket.ticketId}
                    className="bg-card hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Typography
                        as="span"
                        variant="body"
                        size="s"
                        weight="medium"
                      >
                        {ticket.ticketId}
                      </Typography>
                    </td>
                    <td className="px-6 py-4">
                      <Typography
                        as="span"
                        variant="body"
                        size="s"
                        weight="medium"
                      >
                        {ticket.title}
                      </Typography>
                    </td>
                    <td className="px-6 py-4">
                      <Typography
                        as="span"
                        variant="body"
                        size="s"
                        weight="medium"
                      >
                        {ticket.userEmail}
                      </Typography>
                    </td>
                    <td className="px-6 py-4">
                      <Typography
                        as="span"
                        variant="body"
                        size="s"
                        weight="medium"
                        className="text-muted-foreground"
                      >
                        {formatRelativeTime(ticket.createdAt)}
                      </Typography>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  change,
  icon,
}: {
  title: string
  value: string
  change: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Typography
          as="h3"
          variant="body"
          size="s"
          weight="medium"
          className="tracking-tight text-muted-foreground"
        >
          {title}
        </Typography>
        {icon}
      </div>
      <Typography as="div" variant="title" size="m" weight="book">
        {value}
      </Typography>
      <Typography
        as="p"
        variant="caption"
        size="s"
        weight="book"
        className="mt-1 text-muted-foreground"
      >
        {change}
      </Typography>
    </div>
  )
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins} min ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString()
}
