"use strict"

export function logError(context: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(`[${context}] ${error.name}: ${error.message}`)
    if (error.stack) {
      console.error(error.stack)
    }
    return
  }

  console.error(`[${context}] ${String(error)}`)
}
