"use client"

import { useState, useCallback, useRef } from "react"
import { X, Link as LinkIcon, Upload } from "lucide-react"

interface AddTorrentModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AddTorrentModal({
  open,
  onClose,
  onSuccess,
}: AddTorrentModalProps) {
  const [magnetLink, setMagnetLink] = useState("")
  const [torrentFile, setTorrentFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0 && files[0].name.toLowerCase().endsWith(".torrent")) {
      setTorrentFile(files[0])
      setMagnetLink("")
    }
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        setTorrentFile(files[0])
        setMagnetLink("")
      }
    },
    []
  )

  const handleMagnetChange = useCallback((value: string) => {
    setMagnetLink(value)
    if (value.trim()) setTorrentFile(null)
  }, [])

  const clearFile = useCallback(() => {
    setTorrentFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  const canSubmit = Boolean(magnetLink.trim()) || Boolean(torrentFile)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const magnet = magnetLink.trim()
    if (!magnet && !torrentFile) return

    setSubmitting(true)
    try {
      let res: Response

      if (torrentFile) {
        const arrayBuffer = await torrentFile.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        let binary = ""
        const chunkSize = 8192
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize)
          binary += String.fromCharCode.apply(null, chunk as unknown as number[])
        }
        const base64 = btoa(binary)
        res = await fetch("/api/torrent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            torrentBase64: base64,
            fileName: torrentFile.name,
          }),
          credentials: "include",
        })
      } else {
        res = await fetch("/api/torrent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ magnetLink: magnet }),
          credentials: "include",
        })
      }

      let data: { error?: string; details?: string }
      try {
        data = await res.json()
      } catch {
        const text = await res.text()
        throw new Error(
          res.status === 413
            ? "File too large. Max 10MB."
            : `Server error (${res.status}): ${text.slice(0, 100)}`
        )
      }

      if (!res.ok) {
        throw new Error(data.details ?? data.error ?? "Failed to add torrent")
      }

      setMagnetLink("")
      setTorrentFile(null)
      clearFile()
      onSuccess?.()
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add torrent"
      const hint =
        msg === "fetch failed" || msg === "Failed to fetch"
          ? " Check that the dev server is running and the file isn't too large."
          : ""
      setError(msg + hint)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-card-foreground">
              Add Torrent
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close modal</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-5">
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="magnet-link"
                className="text-sm font-medium text-foreground"
              >
                Magnet Link
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="magnet-link"
                  type="text"
                  placeholder="magnet:?xt=urn:btih:..."
                  value={magnetLink}
                  onChange={(e) => handleMagnetChange(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200 ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-secondary/50"
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              {torrentFile ? (
                <div className="mt-3 flex items-center gap-2">
                  <p className="truncate max-w-[240px] text-sm font-medium text-foreground">
                    {torrentFile.name}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      clearFile()
                    }}
                    className="rounded p-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    Drop .torrent file here
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    or click to browse (works with private trackers)
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".torrent"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-accent active:scale-[0.98] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Adding…" : "Add Torrent"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
