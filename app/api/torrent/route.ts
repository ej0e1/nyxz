import { NextRequest, NextResponse } from "next/server"
import { mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import { qbitPostForm } from "@/lib/qbit"
import { prisma } from "@/lib/prisma"
import { requireAuthUserId } from "@/lib/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const BASE_DOWNLOADS = "/downloads"
const MAGNET_REGEX = /^magnet:\?xt=urn:btih:/i

function isValidMagnet(url: string): boolean {
  return typeof url === "string" && MAGNET_REGEX.test(url.trim())
}

function ensureUserPath(userId: string): string {
  const sanitized = userId.replace(/[^a-zA-Z0-9_-]/g, "")
  if (!sanitized) throw new Error("Invalid userId")
  return path.join(BASE_DOWNLOADS, sanitized)
}

/**
 * POST /api/torrent
 * Add torrent via magnet or .torrent file.
 * Saves to /downloads/{userId}. Creates user folder if needed.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuthUserId()
    const userPath = ensureUserPath(userId)

    if (!existsSync(userPath)) {
      await mkdir(userPath, { recursive: true })
    }

    const contentType = request.headers.get("content-type") ?? ""
    const qbitForm = new FormData()
    let magnetForJob = ""

    if (contentType.includes("application/json")) {
      const body = await request.json()
      const torrentBase64 = body.torrentBase64 as string | undefined
      const fileName = (body.fileName as string) ?? "torrent.torrent"
      const magnet = (body.magnetLink ?? body.magnet ?? body.urls ?? "").trim()
      magnetForJob = magnet

      if (torrentBase64) {
        const buffer = Buffer.from(torrentBase64, "base64")
        const blob = new Blob([buffer], { type: "application/x-bittorrent" })
        qbitForm.append("torrents", blob, fileName)
      } else {
        if (!magnet) {
          return NextResponse.json(
            { error: "Missing magnet link or torrent file." },
            { status: 400 }
          )
        }
        if (!isValidMagnet(magnet)) {
          return NextResponse.json(
            { error: "Invalid magnet link. Must start with magnet:?xt=urn:btih:" },
            { status: 400 }
          )
        }
        qbitForm.append("urls", magnet)
      }
    } else {
      const formData = await request.formData()
      const torrentFile = formData.get("torrents") as File | null
      const magnet =
        ((formData.get("magnetLink") ?? formData.get("magnet") ?? formData.get("urls")) as string)?.trim?.() ?? ""
      magnetForJob = magnet

      if (torrentFile && torrentFile.size > 0) {
        qbitForm.append("torrents", torrentFile, torrentFile.name)
      } else if (magnet && isValidMagnet(magnet)) {
        qbitForm.append("urls", magnet)
      } else {
        return NextResponse.json(
          { error: "Provide a .torrent file or a valid magnet link." },
          { status: 400 }
        )
      }
    }

    qbitForm.append("savepath", userPath)

    const job = await prisma.torrentJob.create({
      data: {
        userId: parseInt(userId, 10),
        magnet: magnetForJob || "(.torrent file)",
        status: "queued",
        ratio: 0,
      },
    })

    const text = await qbitPostForm("/api/v2/torrents/add", qbitForm)

    if (text === "Fails.") {
      await prisma.torrentJob.update({
        where: { id: job.id },
        data: { status: "FAILED" },
      })
      return NextResponse.json(
        { error: "qBittorrent failed to add torrent" },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, jobId: job.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const status =
      message.includes("not configured") ||
      message.includes("must be set") ||
      message.includes("login failed")
        ? 503
        : 500
    return NextResponse.json(
      { error: "Failed to add torrent", details: message },
      { status }
    )
  }
}
