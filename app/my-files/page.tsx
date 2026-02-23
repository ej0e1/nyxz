"use client"

import { useState, useCallback, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/dashboard/sidebar"
import { TopNav } from "@/components/dashboard/top-nav"
import { Folder, FileText, ArrowLeft, Download } from "lucide-react"
import { cn } from "@/lib/utils"

const REFRESH_INTERVAL_MS = 10000

type FileItem = {
  key: string
  name: string
  size: number
  lastModified: string
  isFolder: boolean
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 MB"
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(2)} KB`
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getParentPrefix(prefix: string): string | null {
  if (!prefix) return null
  const parts = prefix.replace(/\/$/, "").split("/")
  parts.pop()
  return parts.length > 0 ? `${parts.join("/")}/` : ""
}

function MyFilesContent() {
  const searchParams = useSearchParams()
  const currentPrefix = searchParams.get("prefix") ?? ""

  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [downloading, setDownloading] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const parentPrefix = getParentPrefix(currentPrefix)
  const showBackButton = parentPrefix !== null

  const fetchFiles = useCallback(async () => {
    try {
      const url = currentPrefix
        ? `/api/my-files?prefix=${encodeURIComponent(currentPrefix)}`
        : "/api/my-files"
      const res = await fetch(url, { credentials: "include" })
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error ?? "Failed to fetch files")
      }

      setFiles(data.files ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch files")
      setFiles([])
    } finally {
      setLoading(false)
    }
  }, [currentPrefix])

  useEffect(() => {
    setLoading(true)
    fetchFiles()
  }, [fetchFiles])

  useEffect(() => {
    intervalRef.current = setInterval(fetchFiles, REFRESH_INTERVAL_MS)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchFiles])

  const navigateToFolder = (folderKey: string) => {
    const url = `/my-files?prefix=${encodeURIComponent(folderKey)}`
    window.location.href = url
  }

  const navigateToParent = () => {
    if (parentPrefix === null) return
    const url =
      parentPrefix === ""
        ? "/my-files"
        : `/my-files?prefix=${encodeURIComponent(parentPrefix)}`
    window.location.href = url
  }

  const downloadFile = async (key: string) => {
    setDownloading(key)
    try {
      const res = await fetch(
        `/api/download?key=${encodeURIComponent(key)}`,
        { credentials: "include" }
      )
      const data = await res.json()

      if (!data.success || !data.url) {
        throw new Error(data.error ?? "Failed to get download URL")
      }

      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed")
    } finally {
      setDownloading(null)
    }
  }

  const filteredFiles = searchQuery.trim()
    ? files.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : files

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        activeItem="My Files"
        onItemClick={(label) => {
          if (label === "Dashboard") window.location.href = "/"
        }}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
          onUploadClick={() => {}}
          onAddTorrentClick={() => (window.location.href = "/")}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2">
              {showBackButton && (
                <button
                  onClick={navigateToParent}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <ArrowLeft className="h-4 w-4" />
                  .. Back
                </button>
              )}
              <h1 className="text-xl font-semibold text-foreground">
                My Files
              </h1>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {files.length} item{files.length !== 1 ? "s" : ""} · Auto-refresh
              every 10s
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading files…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <p className="text-center text-sm font-medium text-destructive">
                {error}
              </p>
              <button
                onClick={() => {
                  setLoading(true)
                  fetchFiles()
                }}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
              >
                Retry
              </button>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
                <Folder className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 text-sm font-medium text-foreground">
                No files found
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchQuery
                  ? "Try a different search"
                  : "This folder is empty"}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden sm:block rounded-xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Name
                        </th>
                        <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                          Size
                        </th>
                        <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                          Modified
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFiles.map((file) => (
                        <tr
                          key={file.key}
                          className={cn(
                            "border-b border-border last:border-0 transition-colors",
                            file.isFolder
                              ? "cursor-pointer hover:bg-muted/30"
                              : "hover:bg-muted/30"
                          )}
                          onClick={() =>
                            file.isFolder
                              ? navigateToFolder(file.key)
                              : downloadFile(file.key)
                          }
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                  file.isFolder
                                    ? "bg-primary/10"
                                    : "bg-secondary"
                                )}
                              >
                                {file.isFolder ? (
                                  <Folder className="h-5 w-5 text-primary" />
                                ) : (
                                  <FileText className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <span className="font-medium text-foreground truncate">
                                {file.name}
                              </span>
                              {!file.isFolder && downloading === file.key && (
                                <span className="text-xs text-muted-foreground">
                                  …
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                            {file.isFolder ? "—" : formatSize(file.size)}
                          </td>
                          <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                            {formatDate(file.lastModified)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:hidden">
                {filteredFiles.map((file) => (
                  <div
                    key={file.key}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border border-border bg-card p-4",
                      file.isFolder
                        ? "cursor-pointer active:opacity-80"
                        : ""
                    )}
                    onClick={() =>
                      file.isFolder
                        ? navigateToFolder(file.key)
                        : downloadFile(file.key)
                    }
                  >
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                        file.isFolder ? "bg-primary/10" : "bg-secondary"
                      )}
                    >
                      {file.isFolder ? (
                        <Folder className="h-6 w-6 text-primary" />
                      ) : (
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {file.isFolder
                          ? "Folder"
                          : formatSize(file.size)} ·{" "}
                        {formatDate(file.lastModified)}
                      </p>
                    </div>
                    {!file.isFolder && (
                      <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default function MyFilesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <MyFilesContent />
    </Suspense>
  )
}
