import { NextResponse } from "next/server"
import { requireAuthUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/torrent-jobs
 * Returns TorrentJobs for the authenticated user.
 */
export async function GET() {
  try {
    const userId = await requireAuthUserId()

    const jobs = await prisma.torrentJob.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(jobs)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    )
  }
}
