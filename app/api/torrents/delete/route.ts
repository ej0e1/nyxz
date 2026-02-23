import { NextRequest, NextResponse } from "next/server"
import { qbitPost } from "@/lib/qbit"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * POST /api/torrents/delete
 * Deletes a torrent. Body: { hash: string, deleteFiles?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const hash = body.hash?.trim()
    if (!hash) {
      return NextResponse.json(
        { error: "Missing hash. Provide { hash: string }." },
        { status: 400 }
      )
    }

    const deleteFiles = Boolean(body.deleteFiles)

    await qbitPost("/api/v2/torrents/delete", {
      hashes: hash,
      deleteFiles: String(deleteFiles),
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    const status =
      message.includes("not configured") ||
      message.includes("must be set") ||
      message.includes("login failed")
        ? 503
        : 500

    return NextResponse.json(
      { error: "Failed to delete torrent", details: message },
      { status }
    )
  }
}
