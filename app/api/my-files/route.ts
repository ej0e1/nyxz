import { NextRequest, NextResponse } from "next/server"
import {
  ListObjectsV2Command,
  type _Object,
  type CommonPrefix,
} from "@aws-sdk/client-s3"
import { getWasabiClient, getWasabiBucket } from "@/lib/wasabi"
import { requireAuthUserId } from "@/lib/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type MyFileItem = {
  key: string
  name: string
  size: number
  lastModified: string
  isFolder: boolean
}

type SuccessBody = {
  success: true
  currentPrefix: string
  files: MyFileItem[]
}

type ErrorBody = {
  success: false
  error: string
}

/**
 * GET /api/my-files?prefix=
 * Lists objects scoped to users/{userId}/. Requires auth.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<SuccessBody | ErrorBody>> {
  try {
    const userId = await requireAuthUserId()

    const prefixParam = request.nextUrl.searchParams.get("prefix") ?? ""
    const relPrefix = prefixParam.trim().replace(/^users\/[^/]+\/files\/?/, "")
    const userRoot = `users/${userId}/files/`
    const normalizedPrefix = relPrefix
      ? userRoot + (relPrefix.endsWith("/") ? relPrefix : `${relPrefix}/`)
      : userRoot

    const client = getWasabiClient()
    const bucket = getWasabiBucket()

    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: normalizedPrefix,
      Delimiter: "/",
    })

    const response = await client.send(command)

    const files: MyFileItem[] = []

    if (response.CommonPrefixes) {
      for (const cp of response.CommonPrefixes as CommonPrefix[]) {
        const fullPrefix = cp.Prefix ?? ""
        const name = fullPrefix
          .replace(normalizedPrefix, "")
          .replace(/\/$/, "")
        if (name) {
          files.push({
            key: fullPrefix,
            name,
            size: 0,
            lastModified: new Date(0).toISOString(),
            isFolder: true,
          })
        }
      }
    }

    if (response.Contents) {
      for (const obj of response.Contents as _Object[]) {
        const key = obj.Key ?? ""
        if (!key) continue

        const name = key.replace(normalizedPrefix, "")
        if (!name || name.endsWith("/")) continue

        files.push({
          key,
          name,
          size: obj.Size ?? 0,
          lastModified: (obj.LastModified?.toISOString?.() ?? new Date().toISOString()),
          isFolder: false,
        })
      }
    }

    files.sort((a, b) => {
      if (a.isFolder !== b.isFolder) {
        return a.isFolder ? -1 : 1
      }
      const dateA = new Date(a.lastModified).getTime()
      const dateB = new Date(b.lastModified).getTime()
      return dateB - dateA
    })

    return NextResponse.json({
      success: true,
      currentPrefix: normalizedPrefix,
      files,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[api/my-files] Error:", message)

    if (
      message.includes("must be set") ||
      message.includes("WASABI_")
    ) {
      return NextResponse.json(
        { success: false, error: "Storage not configured" },
        { status: 503 }
      )
    }

    if (message === "Unauthorized") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: "Failed to list files" },
      { status: 500 }
    )
  }
}
