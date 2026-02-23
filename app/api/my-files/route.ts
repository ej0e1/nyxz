import { NextResponse } from "next/server"
import { readdir, stat } from "node:fs/promises"
import { join } from "node:path"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const SCAN_DIR = "/home/nyx9/torrents"

export type MyFileItem = {
  name: string
  isDirectory: boolean
  size: number
  modified: string
}

type ResponseBody =
  | { success: true; total: number; files: MyFileItem[] }
  | { success: false; error: string }

/**
 * GET /api/my-files
 * Lists top-level files and folders from the hardcoded directory.
 * Server-side only, path is not user-configurable.
 */
export async function GET(): Promise<NextResponse<ResponseBody>> {
  try {
    const entries = await readdir(SCAN_DIR, { withFileTypes: true })

    const files: MyFileItem[] = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(SCAN_DIR, entry.name)
        const stats = await stat(fullPath)

        return {
          name: entry.name,
          isDirectory: entry.isDirectory(),
          size: stats.size,
          modified: stats.mtime.toISOString(),
        }
      })
    )

    files.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1
      }
      const dateA = new Date(a.modified).getTime()
      const dateB = new Date(b.modified).getTime()
      return dateB - dateA
    })

    return NextResponse.json({
      success: true,
      total: files.length,
      files,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[api/my-files] Error:", message)

    if (
      (err as NodeJS.ErrnoException)?.code === "ENOENT" ||
      message.includes("ENOENT")
    ) {
      return NextResponse.json(
        { success: false, error: "Directory not found" },
        { status: 404 }
      )
    }

    if (
      (err as NodeJS.ErrnoException)?.code === "EACCES" ||
      message.includes("EACCES")
    ) {
      return NextResponse.json(
        { success: false, error: "Permission denied" },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { success: false, error: "Failed to read directory" },
      { status: 500 }
    )
  }
}
