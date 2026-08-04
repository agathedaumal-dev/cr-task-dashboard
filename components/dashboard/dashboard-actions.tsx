"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RefreshCcw } from "lucide-react"

export function DashboardActions() {
  const router = useRouter()

  return (
    <div className="flex gap-3">
      <Button variant="outline" onClick={() => router.refresh()}>
        <RefreshCcw className="mr-2 h-4 w-4" />
        Refresh Data
      </Button>
      <Button>Download Report</Button>
    </div>
  )
}
