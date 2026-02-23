#!/usr/bin/env node
/**
 * Auto-upload completed qBittorrent downloads to Wasabi S3.
 * Usage: node scripts/upload-to-wasabi.js "%F"
 * (%F = qBittorrent completed path - file or folder)
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

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

function getS3Key(filePath, baseDir) {
  const relative = path.relative(baseDir, filePath);
  return relative.split(path.sep).join("/");
}

async function uploadFile(client, bucket, localPath, key) {
  const body = fs.createReadStream(localPath);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
    })
  );
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

  if (!inputPath || !inputPath.trim()) {
    console.error("Usage: node upload-to-wasabi.js <path>");
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
  const baseDir = stat.isDirectory()
    ? path.dirname(resolvedPath)
    : path.dirname(resolvedPath);

  const files = collectFiles(resolvedPath, baseDir);

  if (files.length === 0) {
    console.log("[UPLOAD START] No files to upload (all hidden or empty)");
    process.exit(0);
  }

  console.log(`[UPLOAD START] ${resolvedPath} (${files.length} file(s))`);

  let allSucceeded = true;
  const uploadedPaths = [];

  for (const filePath of files) {
    const key = getS3Key(filePath, baseDir);

    try {
      await uploadFile(client, config.bucket, filePath, key);
      console.log(`[UPLOAD SUCCESS] ${key}`);
      uploadedPaths.push(filePath);
    } catch (err) {
      console.error(`[UPLOAD FAILED] ${key}:`, err.message);
      allSucceeded = false;
    }
  }

  if (allSucceeded) {
    for (const filePath of uploadedPaths) {
      try {
        await deleteLocal(filePath);
      } catch (err) {
        console.error(`[LOCAL DELETE] FAILED ${filePath}:`, err.message);
      }
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

  process.exit(allSucceeded ? 0 : 1);
}

main().catch((err) => {
  console.error("[UPLOAD FAILED]", err.message);
  process.exit(1);
});
