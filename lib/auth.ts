import { getServerSession as getNextAuthSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"

/**
 * Get authenticated user ID from session.
 * NEVER trust userId from request body - always use this.
 * Returns null if not authenticated.
 */
export async function getAuthUserId(): Promise<string | null> {
  const session = await getNextAuthSession(authOptions)
  return (session?.user?.id as string) ?? null
}

/**
 * Require auth - throws if not authenticated.
 */
export async function requireAuthUserId(): Promise<string> {
  const userId = await getAuthUserId()
  if (!userId) {
    throw new Error("Unauthorized")
  }
  return userId
}
