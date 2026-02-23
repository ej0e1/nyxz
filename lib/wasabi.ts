import { S3Client } from "@aws-sdk/client-s3"

function getConfig() {
  const endpoint = process.env.WASABI_ENDPOINT
  const region = process.env.WASABI_REGION
  const accessKey = process.env.WASABI_ACCESS_KEY
  const secretKey = process.env.WASABI_SECRET_KEY
  const bucket = process.env.WASABI_BUCKET

  if (!endpoint || !region || !accessKey || !secretKey || !bucket) {
    throw new Error(
      "WASABI_ENDPOINT, WASABI_REGION, WASABI_ACCESS_KEY, WASABI_SECRET_KEY, WASABI_BUCKET must be set"
    )
  }

  return { endpoint, region, accessKey, secretKey, bucket }
}

let cachedClient: S3Client | null = null

/**
 * Returns configured S3 client for Wasabi (S3-compatible).
 * Uses path-style access for Wasabi compatibility.
 */
export function getWasabiClient(): S3Client {
  if (cachedClient) return cachedClient

  const { endpoint, region, accessKey, secretKey } = getConfig()

  cachedClient = new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    forcePathStyle: true,
  })

  return cachedClient
}

export function getWasabiBucket(): string {
  return getConfig().bucket
}
