"use client"

import { Search, Upload, Link, Menu, ChevronDown } from "lucide-react"
import { storageUsed, storageTotal } from "@/lib/data"

interface TopNavProps {
  onMobileMenuOpen: () => void
  onUploadClick: () => void
  onAddTorrentClick: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function TopNav({
  onMobileMenuOpen,
  onUploadClick,
  onAddTorrentClick,
  searchQuery,
  onSearchChange,
}: TopNavProps) {
  const usagePercent = Math.round((storageUsed / storageTotal) * 100)

  return (
    <header className="flex flex-col gap-4 border-b border-border bg-card px-4 py-4 sm:flex-row sm:items-center sm:px-6">
      {/* Left side: hamburger + storage */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMobileMenuOpen}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </button>

        {/* Storage usage */}
        <div className="hidden min-w-[200px] sm:block">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Storage</span>
            <span>
              {storageUsed} GB / {storageTotal} GB
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {usagePercent}% used
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative flex-1 sm:mx-4 sm:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
      </div>

      {/* Right side: actions + avatar */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onUploadClick}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
        >
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">Upload</span>
        </button>
        <button
          onClick={onAddTorrentClick}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all duration-200 hover:bg-accent active:scale-[0.98]"
        >
          <Link className="h-4 w-4" />
          <span className="hidden sm:inline">Add Torrent</span>
        </button>

        {/* Avatar */}
        <div className="ml-1 flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-accent">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            JD
          </div>
          <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
        </div>
      </div>
    </header>
  )
}
