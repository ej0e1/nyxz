import { NextRequest, NextResponse } from "next/server"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { getWasabiClient, getWasabiBucket } from "@/lib/wasabi"
import { requireAuthUserId } from "@/lib/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const URL_EXPIRES_IN = 300

/**
 * Sanitize key: reject path traversal, leading slashes, empty.
 */
function sanitizeKey(key: string | null): string | null {
  if (!key || typeof key !== "string") return null
  const trimmed = key.trim()
  if (!trimmed) return null
  if (trimmed.includes("..") || trimmed.startsWith("/")) return null
  return trimmed
}

/**
 * GET /api/download?key=
 * Returns signed URL for direct download from Wasabi.
 * Key must be under users/{userId}/. Requires auth.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuthUserId()

    const keyParam = request.nextUrl.searchParams.get("key")
    const key = sanitizeKey(keyParam)

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Key is required" },
        { status: 400 }
      )
    }

    const allowedPrefix = `users/${userId}/files/`
    if (!key.startsWith(allowedPrefix)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      )
    }

    if (key.endsWith("/")) {
      return NextResponse.json(
        { success: false, error: "Cannot download a folder" },
        { status: 400 }
      )
    }

    const client = getWasabiClient()
    const bucket = getWasabiBucket()

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    const signedUrl = await getSignedUrl(client, command, {
      expiresIn: URL_EXPIRES_IN,
    })

    return NextResponse.json({
      success: true,
      url: signedUrl,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[api/download] Error:", message)

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
      { success: false, error: "Failed to generate download URL" },
      { status: 500 }
    )
  }
}
