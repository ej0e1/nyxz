import { NextRequest, NextResponse } from "next/server"
import { readdir, stat } from "node:fs/promises"
import { join } from "node:path"
import { BASE_DIR, resolveSafePath } from "@/lib/files"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type MyFileItem = {
  name: string
  isDirectory: boolean
  size: number
  modified: string
}

type SuccessBody = {
  success: true
  currentPath: string
  parentPath: string | null
  files: MyFileItem[]
}

type ErrorBody = {
  success: false
  error: string
}

/**
 * GET /api/my-files?path=
 * Lists files and folders. Path is relative to BASE_DIR.
 * Prevents path traversal. Only exposes relative paths.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<SuccessBody | ErrorBody>> {
  try {
    const pathParam = request.nextUrl.searchParams.get("path")
    const parsed = resolveSafePath(pathParam)

    if (!parsed) {
      return NextResponse.json(
        { success: false, error: "Invalid path" },
        { status: 400 }
      )
    }

    const { resolved, relativePath } = parsed

    const entries = await readdir(resolved, { withFileTypes: true })

    const files: MyFileItem[] = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(resolved, entry.name)
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

    const parentPath =
      relativePath === ""
        ? null
        : relativePath.includes("/")
          ? relativePath.split("/").slice(0, -1).join("/")
          : ""

    return NextResponse.json({
      success: true,
      currentPath: relativePath,
      parentPath,
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
      (err as NodeJS.ErrnoException)?.code === "ENOTDIR" ||
      message.includes("ENOTDIR")
    ) {
      return NextResponse.json(
        { success: false, error: "Not a directory" },
        { status: 400 }
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
