import { NextResponse } from "next/server"
import { requireAuthUserId } from "@/lib/auth"
import { getStorageUsageBytes } from "@/lib/storage"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/storage
 * Returns total storage usage (bytes) for the authenticated user.
 */
export async function GET() {
  try {
    const userId = await requireAuthUserId()
    const bytes = await getStorageUsageBytes(userId)

    return NextResponse.json({
      success: true,
      bytes: bytes.toString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    if (message === "Unauthorized") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json(
      { success: false, error: "Failed to get storage usage" },
      { status: 500 }
    )
  }
}
