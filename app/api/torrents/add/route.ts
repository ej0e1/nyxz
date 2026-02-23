import { NextRequest, NextResponse } from "next/server"
import { qbitPostForm } from "@/lib/qbit"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAGNET_REGEX = /^magnet:\?xt=urn:btih:/i

function isValidMagnet(url: string): boolean {
  return typeof url === "string" && MAGNET_REGEX.test(url.trim())
}

/**
 * POST /api/torrents/add
 * Adds a torrent via magnet link or .torrent file.
 * Body: { magnetLink: string } | FormData with "torrents" file
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? ""
    const qbitForm = new FormData()

    if (contentType.includes("application/json")) {
      const body = await request.json()

      const torrentBase64 = body.torrentBase64 as string | undefined
      const fileName = (body.fileName as string) ?? "torrent.torrent"
      const magnetLink = body.magnetLink ?? body.magnet ?? body.urls ?? ""

      if (torrentBase64) {
        const buffer = Buffer.from(torrentBase64, "base64")
        const blob = new Blob([buffer], { type: "application/x-bittorrent" })
        qbitForm.append("torrents", blob, fileName)
      } else {
        const trimmed = magnetLink.trim()
        if (!trimmed) {
          return NextResponse.json(
            { error: "Missing magnet link or torrent file." },
            { status: 400 }
          )
        }
        if (!isValidMagnet(trimmed)) {
          return NextResponse.json(
            {
              error: "Invalid magnet link. Must start with magnet:?xt=urn:btih:",
            },
            { status: 400 }
          )
        }
        qbitForm.append("urls", trimmed)
      }
    } else {
      const formData = await request.formData()
      const torrentFile = formData.get("torrents") as File | null
      const magnetLink =
        (formData.get("magnetLink") as string) ??
        (formData.get("magnet") as string) ??
        (formData.get("urls") as string) ??
        ""

      const trimmedMagnet = magnetLink?.trim?.() ?? ""
      if (torrentFile && torrentFile.size > 0) {
        qbitForm.append("torrents", torrentFile, torrentFile.name)
      } else if (trimmedMagnet && isValidMagnet(trimmedMagnet)) {
        qbitForm.append("urls", trimmedMagnet)
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

    const text = await qbitPostForm("/api/v2/torrents/add", qbitForm)

    if (text === "Fails.") {
      return NextResponse.json(
        { error: "qBittorrent failed to add torrent", details: "Fails." },
        { status: 502 }
      )
    }

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
      { error: "Failed to add torrent", details: message },
      { status }
    )
  }
}
