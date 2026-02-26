import { NextResponse } from "next/server"
import { readdir, stat, mkdir } from "fs/promises"
import path from "path"
import { prisma } from "@/lib/prisma"
import { requireAuthUserId } from "@/lib/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const BASE_DOWNLOADS = "/downloads"

function ensureUserPath(userId: string): string {
  const sanitized = userId.replace(/[^a-zA-Z0-9_-]/g, "")
  if (!sanitized) throw new Error("Invalid userId")
  return path.join(BASE_DOWNLOADS, sanitized)
}

async function collectFiles(dir: string, baseDir: string, files: { key: string; size: bigint }[] = []): Promise<{ key: string; size: bigint }[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const relativePath = path.relative(baseDir, fullPath)
    if (relativePath.includes("..")) continue
    if (entry.isDirectory()) {
      await collectFiles(fullPath, baseDir, files)
    } else if (entry.isFile()) {
      const s = await stat(fullPath)
      files.push({ key: relativePath.replace(/\\/g, "/"), size: BigInt(s.size) })
    }
  }
  return files
}

/**
 * GET /api/files
 * Sync files from /downloads/{userId} to DB, return all user files.
 */
export async function GET() {
  try {
    const userId = await requireAuthUserId()
    const userIdNum = parseInt(userId, 10)
    const userPath = ensureUserPath(userId)

    try {
      await stat(userPath)
    } catch {
      await mkdir(userPath, { recursive: true })
    }

    const diskFiles = await collectFiles(userPath, userPath)

    for (const { key: fileKey, size } of diskFiles) {
      const existing = await prisma.file.findFirst({
        where: { userId: userIdNum, key: fileKey },
      })
      if (!existing) {
        await prisma.file.create({
          data: {
            userId: userIdNum,
            key: fileKey,
            size,
            status: "completed",
          },
        })
      }
    }

    const files = await prisma.file.findMany({
      where: { userId: userIdNum },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      success: true,
      files: files.map((f) => ({
        id: f.id,
        key: f.key,
        size: f.size.toString(),
        status: f.status,
        createdAt: f.createdAt,
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("[api/files] Error:", message)
    return NextResponse.json(
      { error: "Failed to list files", details: message },
      { status: 500 }
    )
  }
}
