"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { logError } from "@/lib/logger"
import { isRateLimited } from "@/lib/rate-limit"
import { checkPermission } from "@/lib/authz-check.server"
import { PERMISSIONS } from "@/lib/rbac"
import { db } from "@/lib/db"
import { tickets, users } from "@/db/schema"

const createTicketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters.")
    .max(100, "Title must be at most 100 characters."),
  description: z
    .string()
    .trim()
    .min(5, "Description must be at least 5 characters.")
    .max(1000, "Description must be at most 1000 characters."),
  // User email passed from the client (available via Clerk's useUser() hook).
  // Used to upsert the user row before linking the ticket.
  userEmail: z.string().email().optional(),
})

export type CreateTicketInput = z.infer<typeof createTicketSchema>

export type ActionResult<TData> = {
  success: boolean
  message: string
  data?: TData
  error?: string
}

export type CreateTicketResultData = {
  ticketId: string
  createdAt: string
}

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 5

export async function createDemoTicket(
  input: CreateTicketInput
): Promise<ActionResult<CreateTicketResultData>> {
  const { userId } = await auth()
  if (!userId) {
    return {
      success: false,
      message: "Authentication required.",
      error: "User is not authenticated.",
    }
  }

  if (
    isRateLimited(userId, {
      windowMs: RATE_LIMIT_WINDOW_MS,
      max: RATE_LIMIT_MAX,
    })
  ) {
    return {
      success: false,
      message: "Rate limit exceeded. Please try again in a minute.",
      error: "Too many requests.",
    }
  }

  const isAuthorized = await checkPermission(PERMISSIONS.FEATURE_A.WRITE)

  if (!isAuthorized) {
    return {
      success: false,
      message: "You do not have permission to perform this action.",
      error: "Forbidden.",
    }
  }

  try {
    const parsed = createTicketSchema.safeParse(input)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => issue.message).join(" ")
      return {
        success: false,
        message: "Validation failed.",
        error: issues || "Invalid input.",
      }
    }

    // Guard: DATABASE_URL must be configured to run this action.
    if (!db) {
      return {
        success: false,
        message: "Database not configured.",
        error: "Set DATABASE_URL in your .env file to enable this feature.",
      }
    }

    // Upsert the user row so the FK constraint on tickets is satisfied.
    // Uses onConflictDoNothing to avoid errors on repeat visits.
    await db
      .insert(users)
      .values({
        id: userId,
        email: parsed.data.userEmail ?? `${userId}@unknown.clerk`,
      })
      .onConflictDoNothing()

    // Insert the ticket linked to the current user.
    const ticketId = `TCK-${Date.now()}`
    await db.insert(tickets).values({
      ticketId,
      title: parsed.data.title,
      description: parsed.data.description,
      userId,
    })

    // Revalidate the dashboard so the live table re-fetches.
    revalidatePath("/")

    return {
      success: true,
      message: "Ticket created successfully.",
      data: {
        ticketId,
        createdAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    logError("Failed to create demo ticket", error)
    return {
      success: false,
      message: "An unexpected error occurred. Please contact support.",
    }
  }
}
