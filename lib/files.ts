import { resolve, relative } from "node:path"

export const BASE_DIR = "/home/nyx9/torrents"

const baseDirResolved = resolve(BASE_DIR)

/**
 * Validates and resolves a path to ensure it's inside BASE_DIR.
 * Returns the resolved absolute path or null if invalid.
 * Prevents path traversal (..) attacks.
 */
export function resolveSafePath(pathParam: string | null): {
  resolved: string
  relativePath: string
} | null {
  if (!pathParam || pathParam.trim() === "") {
    return {
      resolved: baseDirResolved,
      relativePath: "",
    }
  }

  const trimmed = pathParam.trim()
  if (trimmed.includes("..") || trimmed.startsWith("/")) {
    return null
  }

  const resolved = resolve(baseDirResolved, trimmed)
  const rel = relative(baseDirResolved, resolved)

  if (rel.startsWith("..") || rel === "..") {
    return null
  }

  return {
    resolved,
    relativePath: rel || "",
  }
}
