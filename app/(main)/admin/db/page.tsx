import { db } from "@/lib/db"
import { sql } from "drizzle-orm"
import Link from "next/link"
import { Typography } from "@/components/ui/typography"
import { Button } from "@/components/ui/button"
import { Database, Table2 } from "lucide-react"

const PAGE_SIZE = 25

/** Safely double-quotes a PostgreSQL identifier. */
function quoteIdent(name: string): string {
  return '"' + name.replace(/"/g, '""') + '"'
}

type ColumnInfo = { column_name: string; data_type: string }

export default async function AdminDbPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string; page?: string }>
}) {
  const { table: tableParam, page: pageParam } = await searchParams

  if (!db) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Database className="h-12 w-12 text-muted-foreground" />
        <Typography as="p" variant="body" size="m" className="text-muted-foreground">
          No database connected. Set DATABASE_URL to use this page.
        </Typography>
      </div>
    )
  }

  // List all user tables in the public schema
  const tablesResult = await db.execute(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `) as unknown as Array<{ table_name: string }>

  const tableNames = tablesResult.map((r) => r.table_name)

  // Validate the selected table against actual DB tables to prevent injection
  const validTable =
    tableParam && tableNames.includes(tableParam) ? tableParam : null

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  let columns: ColumnInfo[] = []
  let rows: Record<string, unknown>[] = []
  let totalRows = 0

  if (validTable) {
    const [colResult, countResult] = await Promise.all([
      db.execute(sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${validTable}
        ORDER BY ordinal_position
      `) as unknown as Promise<ColumnInfo[]>,
      db.execute(
        sql`SELECT COUNT(*) AS count FROM ${sql.raw(quoteIdent(validTable))}`
      ) as unknown as Promise<Array<{ count: string }>>,
    ])

    columns = colResult
    totalRows = parseInt(countResult[0]?.count ?? "0", 10)

    const dataResult = await db.execute(
      sql`SELECT * FROM ${sql.raw(quoteIdent(validTable))} LIMIT ${PAGE_SIZE} OFFSET ${offset}`
    ) as unknown as Record<string, unknown>[]

    rows = dataResult
  }

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
  const tableHref = (t: string, p = 1) =>
    `/admin/db?table=${encodeURIComponent(t)}&page=${p}`

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="w-52 shrink-0">
        <Typography
          as="h2"
          variant="title"
          size="s"
          weight="book"
          className="mb-3 text-foreground"
        >
          Tables
        </Typography>
        {tableNames.length === 0 ? (
          <Typography as="p" variant="caption" size="s" className="text-muted-foreground">
            No tables found.
          </Typography>
        ) : (
          <nav className="flex flex-col gap-0.5">
            {tableNames.map((name) => (
              <Link
                key={name}
                href={tableHref(name)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  validTable === name
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <Table2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="truncate font-medium">{name}</span>
              </Link>
            ))}
          </nav>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {!validTable ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <Typography as="p" variant="body" size="m" className="text-muted-foreground">
              Select a table from the sidebar to inspect its data.
            </Typography>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <Typography as="h1" variant="title" size="m" weight="book">
                  {validTable}
                </Typography>
                <Typography
                  as="p"
                  variant="caption"
                  size="s"
                  className="text-muted-foreground mt-0.5"
                >
                  {totalRows.toLocaleString()} row{totalRows !== 1 ? "s" : ""}
                  {totalPages > 1 && ` · page ${page} of ${totalPages}`}
                </Typography>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  {page > 1 ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={tableHref(validTable, page - 1)}>Previous</Link>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      Previous
                    </Button>
                  )}
                  {page < totalPages ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={tableHref(validTable, page + 1)}>Next</Link>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      Next
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Table */}
            <div className="bg-card rounded-xl border shadow-sm overflow-auto">
              {rows.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <Typography as="p" variant="body" size="s" className="text-muted-foreground">
                    No rows in this table.
                  </Typography>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col.column_name}
                          className="px-4 py-3 text-left whitespace-nowrap"
                        >
                          <Typography
                            as="span"
                            variant="caption"
                            size="s"
                            weight="book"
                            className="uppercase text-muted-foreground block"
                          >
                            {col.column_name}
                          </Typography>
                          <span className="text-[10px] text-muted-foreground/60 font-normal normal-case">
                            {col.data_type}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((row, i) => (
                      <tr
                        key={i}
                        className="bg-card hover:bg-muted/50 transition-colors"
                      >
                        {columns.map((col) => (
                          <td
                            key={col.column_name}
                            className="px-4 py-3 whitespace-nowrap"
                          >
                            <CellValue value={row[col.column_name]} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground/50 italic text-xs">null</span>
  }
  if (value instanceof Date) {
    return (
      <Typography as="span" variant="body" size="s">
        {value.toISOString()}
      </Typography>
    )
  }
  if (typeof value === "object") {
    return (
      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono truncate block max-w-[280px]">
        {JSON.stringify(value)}
      </code>
    )
  }
  return (
    <Typography
      as="span"
      variant="body"
      size="s"
      className="truncate block max-w-[300px]"
    >
      {String(value)}
    </Typography>
  )
}
