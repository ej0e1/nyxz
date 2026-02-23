import { NextRequest, NextResponse } from "next/server"
import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { basename } from "node:path"
import { resolveSafePath } from "@/lib/files"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/download?path=
 * Streams a file for download. Path is relative to BASE_DIR.
 * Prevents path traversal. Directories return 400.
 */
export async function GET(request: NextRequest) {
  try {
    const pathParam = request.nextUrl.searchParams.get("path")

    if (!pathParam || pathParam.trim() === "") {
      return NextResponse.json(
        { error: "Path is required" },
        { status: 400 }
      )
    }

    const parsed = resolveSafePath(pathParam.trim())

    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid path" },
        { status: 400 }
      )
    }

    const { resolved } = parsed

    const fileStat = await stat(resolved)

    if (fileStat.isDirectory()) {
      return NextResponse.json(
        { error: "Cannot download a directory" },
        { status: 400 }
      )
    }

    const filename = basename(resolved)
    const stream = createReadStream(resolved)

    return new Response(stream as unknown as ReadableStream, {
      headers: {
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Type": "application/octet-stream",
        "Content-Length": String(fileStat.size),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[api/download] Error:", message)

    if (
      (err as NodeJS.ErrnoException)?.code === "ENOENT" ||
      message.includes("ENOENT")
    ) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      )
    }

    if (
      (err as NodeJS.ErrnoException)?.code === "EACCES" ||
      message.includes("EACCES")
    ) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    )
  }
}
