import { NextRequest, NextResponse } from "next/server"
import { qbitPostForm } from "@/lib/qbit"
import { prisma } from "@/lib/prisma"
import { requireAuthUserId } from "@/lib/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAGNET_REGEX = /^magnet:\?xt=urn:btih:/i

function isValidMagnet(url: string): boolean {
  return typeof url === "string" && MAGNET_REGEX.test(url.trim())
}

function getJobsBasePath(): string {
  const base = process.env.QBIT_JOBS_PATH ?? process.env.QBIT_SAVE_PATH
  if (!base?.trim()) {
    throw new Error("QBIT_JOBS_PATH or QBIT_SAVE_PATH must be set for job isolation")
  }
  return base.replace(/\/$/, "")
}

/**
 * POST /api/torrents/add
 * Adds a torrent via magnet link or .torrent file.
 * Creates TorrentJob, adds to qBittorrent with category=jobId for upload script.
 * Body: { magnetLink: string } | FormData with "torrents" file
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuthUserId()

    const contentType = request.headers.get("content-type") ?? ""
    const qbitForm = new FormData()
    let magnetLinkForJob = ""

    if (contentType.includes("application/json")) {
      const body = await request.json()

      const torrentBase64 = body.torrentBase64 as string | undefined
      const fileName = (body.fileName as string) ?? "torrent.torrent"
      const magnetLink = (body.magnetLink ?? body.magnet ?? body.urls ?? "").trim()
      magnetLinkForJob = magnetLink

      if (torrentBase64) {
        const buffer = Buffer.from(torrentBase64, "base64")
        const blob = new Blob([buffer], { type: "application/x-bittorrent" })
        qbitForm.append("torrents", blob, fileName)
      } else {
        if (!magnetLink) {
          return NextResponse.json(
            { error: "Missing magnet link or torrent file." },
            { status: 400 }
          )
        }
        if (!isValidMagnet(magnetLink)) {
          return NextResponse.json(
            {
              error: "Invalid magnet link. Must start with magnet:?xt=urn:btih:",
            },
            { status: 400 }
          )
        }
        qbitForm.append("urls", magnetLink)
      }
    } else {
      const formData = await request.formData()
      const torrentFile = formData.get("torrents") as File | null
      const magnet =
        ((formData.get("magnetLink") ?? formData.get("magnet") ?? formData.get("urls")) as string)?.trim?.() ?? ""
      magnetLinkForJob = magnet

      if (torrentFile && torrentFile.size > 0) {
        qbitForm.append("torrents", torrentFile, torrentFile.name)
      } else if (magnet && isValidMagnet(magnet)) {
        qbitForm.append("urls", magnet)
      } else {
        return NextResponse.json(
          {
            error:
              "Provide a .torrent file or a valid magnet link (magnet:?xt=urn:btih:...).",
          },
          { status: 400 }
        )
      }
    }

    const job = await prisma.torrentJob.create({
      data: {
        userId: parseInt(userId, 10),
        magnet: magnetLinkForJob || "(.torrent file)",
        status: "queued",
        ratio: 0,
      },
    })

    const jobsBase = getJobsBasePath()
    const savepath = `${jobsBase}/${job.id}`
    qbitForm.append("savepath", savepath)
    qbitForm.append("category", String(job.id))

    const text = await qbitPostForm("/api/v2/torrents/add", qbitForm)

    if (text === "Fails.") {
      await prisma.torrentJob.update({
        where: { id: job.id },
        data: { status: "FAILED" },
      })
      return NextResponse.json(
        { error: "qBittorrent failed to add torrent", details: "Fails." },
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
