"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { createDemoTicket } from "@/app/actions/demo-actions"

export function NotificationCenter() {
  const { user } = useUser()
  const [shouldThrow, setShouldThrow] = useState(false)

  if (shouldThrow) {
    throw new Error("Test error: Dashboard error boundary triggered.")
  }

  const handleSuccess = () => {
    toast.success("Request Approved", {
      description: "Reimbursement #4920 has been processed successfully.",
    })
  }

  const handleError = () => {
    toast.error("Sync Failed", {
      description: "Could not connect to the HR database. Retrying in 5s...",
    })
  }

  const handleInfo = () => {
    toast.info("System Update", {
      description: "Maintenance scheduled for tonight at 02:00 AM CET.",
    })
  }

  const handleAction = () => {
    toast("New Ticket Assigned", {
      description: "Ticket #1029 was assigned to your queue.",
      action: {
        label: "View Ticket",
        onClick: () => console.log("Navigating..."),
      },
    })
  }

  const handleServerAction = async () => {
    const toastId = toast.loading("Loading...")
    try {
      const result = await createDemoTicket({
        title: "Demo Ticket from Dashboard",
        description: "Database write triggered from the Notification Center.",
        userEmail: user?.primaryEmailAddress?.emailAddress,
      })

      if (result.success) {
        toast.success(result.message, {
          id: toastId,
          description: result.data
            ? `Ticket ${result.data.ticketId} created.`
            : undefined,
        })
        return
      }

      toast.error(result.message, {
        id: toastId,
        description: result.error ?? "Unknown error.",
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error."
      toast.error("Request failed.", {
        id: toastId,
        description: message,
      })
    }
  }

  return (
    <div className="bg-card rounded-xl border shadow-sm p-6">
      <Typography
        as="h2"
        variant="title"
        size="s"
        weight="book"
        className="mb-4"
      >
        Notification Center (Test)
      </Typography>
      <Typography
        as="p"
        variant="body"
        size="s"
        weight="medium"
        className="mb-6 max-w-2xl text-muted-foreground"
      >
        Use these triggers to test the Sonner feedback system. &quot;Simulate
        Server Action&quot; writes a real ticket to the database and refreshes
        the table below.
      </Typography>

      <div className="flex flex-wrap gap-4">
        <Button
          onClick={handleSuccess}
          className="bg-success btn-terciary hover:bg-success/90 text-success-foreground"
        >
          Trigger Success
        </Button>
        <Button onClick={handleError} variant="destructive">
          Trigger Error
        </Button>
        <Button
          onClick={handleInfo}
          variant="secondary"
          className="bg-info/10 text-info hover:bg-info/20"
        >
          Trigger Info
        </Button>
        <Button onClick={handleAction} variant="outline">
          Trigger Action
        </Button>
        <Button onClick={handleServerAction}>Simulate Server Action</Button>
        <Button
          variant="destructive"
          onClick={() => setShouldThrow(true)}
        >
          Trigger Error Boundary
        </Button>
      </div>
    </div>
  )
}
