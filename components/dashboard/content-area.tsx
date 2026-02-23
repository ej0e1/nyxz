"use client"

import { LayoutGrid, List, Magnet } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TorrentItem } from "@/lib/types"
import { TorrentCard } from "./torrent-card"

interface ContentAreaProps {
  torrents: TorrentItem[]
  view: "grid" | "list"
  onViewChange: (view: "grid" | "list") => void
  onPause: (hash: string) => void
  onResume: (hash: string) => void
  onDelete: (hash: string) => void
  isActionLoading?: boolean
}

export function ContentArea({
  torrents,
  view,
  onViewChange,
  onPause,
  onResume,
  onDelete,
  isActionLoading = false,
}: ContentAreaProps) {
  return (
    <main className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Torrents</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {torrents.length} torrent{torrents.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          <button
            onClick={() => onViewChange("grid")}
            className={cn(
              "rounded-lg p-2 transition-all duration-200",
              view === "grid"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="sr-only">Grid view</span>
          </button>
          <button
            onClick={() => onViewChange("list")}
            className={cn(
              "rounded-lg p-2 transition-all duration-200",
              view === "list"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="h-4 w-4" />
            <span className="sr-only">List view</span>
          </button>
        </div>
      </div>

      {torrents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
            <Magnet className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">
            No torrents
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a magnet link to get started
          </p>
        </div>
      )}

      {torrents.length > 0 && view === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {torrents.map((torrent) => (
            <TorrentCard
              key={torrent.hash}
              torrent={torrent}
              view={view}
              onPause={onPause}
              onResume={onResume}
              onDelete={onDelete}
              isActionLoading={isActionLoading}
            />
          ))}
        </div>
      ) : torrents.length > 0 ? (
        <div className="flex flex-col gap-2">
          {torrents.map((torrent) => (
            <TorrentCard
              key={torrent.hash}
              torrent={torrent}
              view={view}
              onPause={onPause}
              onResume={onResume}
              onDelete={onDelete}
              isActionLoading={isActionLoading}
            />
          ))}
        </div>
      ) : null}
    </main>
  )
}
