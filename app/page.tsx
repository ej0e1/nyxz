"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { TopNav } from "@/components/dashboard/top-nav"
import { ContentArea } from "@/components/dashboard/content-area"
import { AddTorrentModal } from "@/components/dashboard/add-torrent-modal"
import type { TorrentItem } from "@/lib/types"

const REFRESH_INTERVAL_MS = 5000

export default function DashboardPage() {
  const [activeNav, setActiveNav] = useState("Dashboard")
  const [view, setView] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [torrentModalOpen, setTorrentModalOpen] = useState(false)
  const [torrents, setTorrents] = useState<TorrentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchTorrents = useCallback(async () => {
    try {
      const res = await fetch("/api/torrents", { credentials: "include" })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.details ?? data.error ?? "Failed to fetch torrents")
      }

      setTorrents(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch torrents")
      setTorrents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTorrents()
  }, [fetchTorrents])

  useEffect(() => {
    intervalRef.current = setInterval(fetchTorrents, REFRESH_INTERVAL_MS)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchTorrents])

  const filteredTorrents = searchQuery.trim()
    ? torrents.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : torrents

  const handlePause = useCallback(async (hash: string) => {
    setActionLoading(true)
    try {
      const res = await fetch("/api/torrents/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash }),
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.details ?? data.error)
      await fetchTorrents()
    } finally {
      setActionLoading(false)
    }
  }, [fetchTorrents])

  const handleResume = useCallback(async (hash: string) => {
    setActionLoading(true)
    try {
      const res = await fetch("/api/torrents/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash }),
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.details ?? data.error)
      await fetchTorrents()
    } finally {
      setActionLoading(false)
    }
  }, [fetchTorrents])

  const handleDelete = useCallback(async (hash: string) => {
    setActionLoading(true)
    try {
      const res = await fetch("/api/torrents/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash, deleteFiles: false }),
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.details ?? data.error)
      await fetchTorrents()
    } finally {
      setActionLoading(false)
    }
  }, [fetchTorrents])

  const handleAddSuccess = useCallback(() => {
    setTorrentModalOpen(false)
    fetchTorrents()
  }, [fetchTorrents])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        activeItem={activeNav}
        onItemClick={setActiveNav}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
          onUploadClick={() => {}}
          onAddTorrentClick={() => setTorrentModalOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading torrents…</p>
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
            <p className="text-center text-sm font-medium text-destructive">
              {error}
            </p>
            <button
              onClick={() => {
                setLoading(true)
                fetchTorrents()
              }}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              Retry
            </button>
          </div>
        ) : (
          <ContentArea
            torrents={filteredTorrents}
            view={view}
            onViewChange={setView}
            onPause={handlePause}
            onResume={handleResume}
            onDelete={handleDelete}
            isActionLoading={actionLoading}
          />
        )}
      </div>

      <AddTorrentModal
        open={torrentModalOpen}
        onClose={() => setTorrentModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  )
}
