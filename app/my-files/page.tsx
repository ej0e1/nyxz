"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { TopNav } from "@/components/dashboard/top-nav"
import { Folder, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

const REFRESH_INTERVAL_MS = 10000

type FileItem = {
  name: string
  isDirectory: boolean
  size: number
  modified: string
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

export default function MyFilesPage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/my-files", { credentials: "include" })
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
  }, [])

  useEffect(() => {
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
            <h1 className="text-xl font-semibold text-foreground">
              My Files
            </h1>
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
                        key={file.name}
                        className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-xl",
                                file.isDirectory
                                  ? "bg-primary/10"
                                  : "bg-secondary"
                              )}
                            >
                              {file.isDirectory ? (
                                <Folder className="h-5 w-5 text-primary" />
                              ) : (
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <span className="font-medium text-foreground truncate">
                              {file.name}
                            </span>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                          {file.isDirectory ? "—" : formatSize(file.size)}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                          {formatDate(file.modified)}
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
                  key={file.name}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                      file.isDirectory ? "bg-primary/10" : "bg-secondary"
                    )}
                  >
                    {file.isDirectory ? (
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
                      {file.isDirectory ? "Folder" : formatSize(file.size)} ·{" "}
                      {formatDate(file.modified)}
                    </p>
                  </div>
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
