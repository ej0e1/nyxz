#!/usr/bin/env node
/**
 * Auto-upload completed qBittorrent downloads to Wasabi S3.
 * Integrates with Prisma: TorrentJob, File records; user-scoped keys.
 *
 * Usage: node scripts/upload-to-wasabi.js "%F" "%L"
 *   %F = qBittorrent content path (file or folder)
 *   %L = category (= jobId, set when adding via API)
 *
 * If %L (jobId) is missing, runs in legacy mode: uploads to bucket root, no DB.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });

const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function getConfig() {
  const endpoint = process.env.WASABI_ENDPOINT;
  const region = process.env.WASABI_REGION;
  const accessKey = process.env.WASABI_ACCESS_KEY;
  const secretKey = process.env.WASABI_SECRET_KEY;
  const bucket = process.env.WASABI_BUCKET;

  if (!endpoint || !region || !accessKey || !secretKey || !bucket) {
    throw new Error(
      "WASABI_ENDPOINT, WASABI_REGION, WASABI_ACCESS_KEY, WASABI_SECRET_KEY, WASABI_BUCKET must be set"
    );
  }

  return { endpoint, region, accessKey, secretKey, bucket };
}

function isHiddenFile(name) {
  return path.basename(name).startsWith(".");
}

function collectFiles(inputPath, baseDir, files = []) {
  const stat = fs.statSync(inputPath);

  if (stat.isFile()) {
    if (!isHiddenFile(inputPath)) {
      files.push(inputPath);
    }
    return files;
  }

  if (stat.isDirectory()) {
    const entries = fs.readdirSync(inputPath);
    for (const entry of entries) {
      const fullPath = path.join(inputPath, entry);
      collectFiles(fullPath, baseDir, files);
    }
  }

  return files;
}

/**
 * Get S3 key. With userId: users/{userId}/files/{fileName}
 * Legacy mode (no userId): relative path from baseDir
 */
function getS3Key(filePath, baseDir, userId) {
  const fileName = path.basename(filePath);
  if (userId) {
    const relative = path.relative(baseDir, filePath);
    const suffix = relative.split(path.sep).join("/");
    return `users/${userId}/files/${suffix}`;
  }
  const relative = path.relative(baseDir, filePath);
  return relative.split(path.sep).join("/");
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".mp4": "video/mp4",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".flac": "audio/flac",
    ".wav": "audio/wav",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
    ".zip": "application/zip",
  };
  return map[ext] ?? "application/octet-stream";
}

/**
 * Upload file and return metadata.
 */
async function uploadFile(client, bucket, localPath, key) {
  const stat = fs.statSync(localPath);
  const body = fs.createReadStream(localPath);
  const mimeType = getMimeType(localPath);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: mimeType,
    })
  );

  return {
    name: path.basename(localPath),
    size: stat.size,
    mimeType,
    wasabiKey: key,
  };
}

async function deleteLocal(filePath) {
  try {
    fs.unlinkSync(filePath);
    console.log(`[LOCAL DELETE] ${filePath}`);
  } catch (err) {
    console.error(`[LOCAL DELETE] FAILED ${filePath}:`, err.message);
  }
}

async function main() {
  const inputPath = process.argv[2];
  const jobId = process.argv[3]?.trim() || null;

  if (!inputPath || !inputPath.trim()) {
    console.error("Usage: node upload-to-wasabi.js <path> [jobId]");
    process.exit(1);
  }

  const resolvedPath = path.resolve(inputPath.trim());

  if (!fs.existsSync(resolvedPath)) {
    console.error(`[UPLOAD FAILED] Path does not exist: ${resolvedPath}`);
    process.exit(1);
  }

  let config;
  try {
    config = getConfig();
  } catch (err) {
    console.error("[UPLOAD FAILED] Configuration:", err.message);
    process.exit(1);
  }

  let userId = null;
  let job = null;

  if (jobId) {
    try {
      job = await prisma.torrentJob.findUnique({
        where: { id: jobId },
      });
      if (!job) {
        console.error(`[UPLOAD FAILED] TorrentJob not found: ${jobId}`);
        await prisma.$disconnect();
        process.exit(1);
      }
      userId = job.userId;
    } catch (err) {
      console.error("[UPLOAD FAILED] DB lookup:", err.message);
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    forcePathStyle: true,
  });

  const stat = fs.statSync(resolvedPath);
  const baseDir = stat.isDirectory() ? resolvedPath : path.dirname(resolvedPath);

  const files = stat.isDirectory()
    ? collectFiles(resolvedPath, resolvedPath)
    : [resolvedPath];

  if (files.length === 0) {
    console.log("[UPLOAD START] No files to upload (all hidden or empty)");
    if (job) {
      await prisma.torrentJob.update({
        where: { id: jobId },
        data: { status: "COMPLETED", progress: 100, completedAt: new Date() },
      });
    }
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log(
    `[UPLOAD START] ${resolvedPath} (${files.length} file(s))${jobId ? ` jobId=${jobId}` : " legacy"}`
  );

  let allSucceeded = true;
  const uploadedPaths = [];
  const uploadedMeta = [];

  for (const filePath of files) {
    const key = getS3Key(filePath, baseDir, userId);

    try {
      const meta = await uploadFile(client, config.bucket, filePath, key);
      console.log(`[UPLOAD SUCCESS] ${key}`);
      uploadedPaths.push(filePath);
      uploadedMeta.push(meta);
    } catch (err) {
      console.error(`[UPLOAD FAILED] ${key}:`, err.message);
      allSucceeded = false;
    }
  }

  if (allSucceeded && userId && job) {
    try {
      for (const meta of uploadedMeta) {
        await prisma.file.create({
          data: {
            userId,
            name: meta.name,
            size: meta.size,
            mimeType: meta.mimeType,
            wasabiKey: meta.wasabiKey,
          },
        });
      }

      await prisma.torrentJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          progress: 100,
          completedAt: new Date(),
        },
      });
    } catch (err) {
      console.error("[UPLOAD FAILED] DB update:", err.message);
      await prisma.torrentJob.update({
        where: { id: jobId },
        data: { status: "FAILED" },
      });
      allSucceeded = false;
    }

    for (const filePath of uploadedPaths) {
      await deleteLocal(filePath);
    }

    if (stat.isDirectory()) {
      try {
        fs.rmSync(resolvedPath, { recursive: true, force: true });
        console.log(`[LOCAL DELETE] ${resolvedPath}`);
      } catch (e) {
        console.error(`[LOCAL DELETE] FAILED ${resolvedPath}:`, e.message);
      }
    }
  } else if (!allSucceeded && job) {
    await prisma.torrentJob.update({
      where: { id: jobId },
      data: { status: "FAILED" },
    });
  } else if (allSucceeded && !userId) {
    for (const filePath of uploadedPaths) {
      await deleteLocal(filePath);
    }
    if (stat.isDirectory()) {
      try {
        fs.rmSync(resolvedPath, { recursive: true, force: true });
        console.log(`[LOCAL DELETE] ${resolvedPath}`);
      } catch (e) {
        console.error(`[LOCAL DELETE] FAILED ${resolvedPath}:`, e.message);
      }
    }
  }

  await prisma.$disconnect();
  process.exit(allSucceeded ? 0 : 1);
}

main().catch(async (err) => {
  console.error("[UPLOAD FAILED]", err.message);
  await prisma.$disconnect();
  process.exit(1);
});
