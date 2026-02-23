import { NextResponse } from "next/server"
import { getTorrents } from "@/lib/qbit"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type QbitTorrent = {
  hash: string
  name: string
  size: number
  progress: number
  dlspeed: number
  upspeed: number
  ratio: number
  state: string
  [key: string]: unknown
}

/**
 * GET /api/torrents
 * Returns the torrent list from qBittorrent.
 */
export async function GET() {
  try {
    const torrents = await getTorrents()
    return NextResponse.json(torrents ?? [])
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    const cause = err instanceof Error ? err.cause : undefined
    const causeMsg = cause instanceof Error ? cause.message : ""

    console.error("[api/torrents] Error:", message, causeMsg || "")

    let details = message
    if (
      message.includes("other side closed") ||
      causeMsg.includes("other side closed")
    ) {
      details =
        "Connection closed by qBittorrent server. Check: (1) nginx/reverse proxy allows non-browser clients, (2) firewall allows outbound from this machine, (3) try HTTPS if server requires it."
    }

    const status =
      message.includes("not configured") ||
      message.includes("must be set") ||
      message.includes("login failed") ||
      message.includes("Session expired")
        ? 503
        : 500

    return NextResponse.json(
      { error: "Failed to fetch torrents", details },
      { status }
    )
  }
}
