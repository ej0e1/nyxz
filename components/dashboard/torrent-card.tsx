"use client"

import { useState, useRef, useEffect } from "react"
import { MoreHorizontal, Pause, Play, Trash2 } from "lucide-react"
import type { TorrentItem } from "@/lib/types"
import { FileIcon } from "./file-icon"
import { cn } from "@/lib/utils"

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatSpeed(bytesPerSec: number): string {
  return bytesPerSec > 0 ? `${formatBytes(bytesPerSec)}/s` : "—"
}

function getStateLabel(state: string): string {
  const labels: Record<string, string> = {
    downloading: "Downloading",
    stalledDL: "Stalled",
    metaDL: "Fetching metadata",
    pausedDL: "Paused",
    pausedUP: "Seeding (paused)",
    uploading: "Seeding",
    stalledUP: "Stalled (seeding)",
    checkingDL: "Checking",
    checkingUP: "Checking",
    queuedDL: "Queued",
    queuedUP: "Queued",
    error: "Error",
    missingFiles: "Missing files",
    allocating: "Allocating",
    moving: "Moving",
    unknown: "—",
  }
  return labels[state] ?? state
}

function isPaused(state: string): boolean {
  return state.startsWith("paused") || state === "error"
}

interface TorrentCardProps {
  torrent: TorrentItem
  view: "grid" | "list"
  onPause: (hash: string) => void
  onResume: (hash: string) => void
  onDelete: (hash: string) => void
  isActionLoading?: boolean
}

export function TorrentCard({
  torrent,
  view,
  onPause,
  onResume,
  onDelete,
  isActionLoading = false,
}: TorrentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const paused = isPaused(torrent.state)
  const progressPct = Math.round(torrent.progress * 100)

  if (view === "list") {
    return (
      <div className="group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 transition-all duration-200 hover:border-primary/20 hover:shadow-sm">
        <FileIcon type="torrent" size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-card-foreground">
            {torrent.name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {getStateLabel(torrent.state)} · {progressPct}%
          </p>
        </div>
        <span className="hidden text-xs text-muted-foreground sm:block">
          {formatBytes(torrent.size)}
        </span>
        <span className="text-xs text-muted-foreground">
          ↓ {formatSpeed(torrent.dlspeed)} ↑ {formatSpeed(torrent.upspeed)}
        </span>
        <span className="text-xs text-muted-foreground">
          Ratio: {torrent.ratio >= 0 ? torrent.ratio.toFixed(2) : "—"}
        </span>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all duration-200 hover:bg-accent hover:text-foreground group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Torrent options</span>
          </button>
          {menuOpen && (
            <ContextMenu
              hash={torrent.hash}
              paused={paused}
              onPause={onPause}
              onResume={onResume}
              onDeleteClick={() => {
                setMenuOpen(false)
                setDeleteConfirmOpen(true)
              }}
              onClose={() => setMenuOpen(false)}
              disabled={isActionLoading}
            />
          )}
        </div>
        {deleteConfirmOpen && (
          <DeleteConfirmDialog
            name={torrent.name}
            onConfirm={() => {
              onDelete(torrent.hash)
              setDeleteConfirmOpen(false)
            }}
            onCancel={() => setDeleteConfirmOpen(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:border-primary/20 hover:shadow-md">
      <div className="flex flex-col items-center gap-3 px-4 pb-3 pt-6">
        <FileIcon type="torrent" size="lg" />
        <div className="w-full text-center">
          <p className="truncate text-sm font-medium text-card-foreground">
            {torrent.name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {getStateLabel(torrent.state)} · {progressPct}%
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatBytes(torrent.size)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            ↓ {formatSpeed(torrent.dlspeed)} ↑ {formatSpeed(torrent.upspeed)}
          </p>
          <p className="text-xs text-muted-foreground">
            Ratio: {torrent.ratio >= 0 ? torrent.ratio.toFixed(2) : "—"}
          </p>
        </div>
      </div>

      <div className="mb-2 px-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              progressPct >= 100 ? "bg-primary" : "bg-primary/70"
            )}
            style={{ width: `${Math.min(100, progressPct)}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border bg-secondary/50 px-4 py-2.5">
        <span className="text-xs text-muted-foreground">
          {formatSpeed(torrent.dlspeed)} / {formatSpeed(torrent.upspeed)}
        </span>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-1 text-muted-foreground opacity-0 transition-all duration-200 hover:bg-accent hover:text-foreground group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Torrent options</span>
          </button>
          {menuOpen && (
            <ContextMenu
              hash={torrent.hash}
              paused={paused}
              onPause={onPause}
              onResume={onResume}
              onDeleteClick={() => {
                setMenuOpen(false)
                setDeleteConfirmOpen(true)
              }}
              onClose={() => setMenuOpen(false)}
              disabled={isActionLoading}
            />
          )}
        </div>
      </div>

      {deleteConfirmOpen && (
        <DeleteConfirmDialog
          name={torrent.name}
          onConfirm={() => {
            onDelete(torrent.hash)
            setDeleteConfirmOpen(false)
          }}
          onCancel={() => setDeleteConfirmOpen(false)}
        />
      )}
    </div>
  )
}

function ContextMenu({
  hash,
  paused,
  onPause,
  onResume,
  onDeleteClick,
  onClose,
  disabled,
}: {
  hash: string
  paused: boolean
  onPause: (hash: string) => void
  onResume: (hash: string) => void
  onDeleteClick: () => void
  onClose: () => void
  disabled: boolean
}) {
  return (
    <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-lg">
      {paused ? (
        <button
          onClick={() => {
            onResume(hash)
            onClose()
          }}
          disabled={disabled}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          Resume
        </button>
      ) : (
        <button
          onClick={() => {
            onPause(hash)
            onClose()
          }}
          disabled={disabled}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent disabled:opacity-50"
        >
          <Pause className="h-4 w-4" />
          Pause
        </button>
      )}
      <button
        onClick={onDeleteClick}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
    </div>
  )
}

function DeleteConfirmDialog({
  name,
  onConfirm,
  onCancel,
}: {
  name: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-card-foreground">
          Delete torrent?
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Remove &quot;{name}&quot; from the list? Downloaded files will not be
          deleted.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
