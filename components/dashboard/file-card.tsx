"use client"

import { useState, useRef, useEffect } from "react"
import { MoreHorizontal, Download, Pencil, Trash2 } from "lucide-react"
import type { FileItem } from "@/lib/data"
import { FileIcon } from "./file-icon"

interface FileCardProps {
  file: FileItem
  view: "grid" | "list"
}

export function FileCard({ file, view }: FileCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
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

  if (view === "list") {
    return (
      <div className="group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 transition-all duration-200 hover:border-primary/20 hover:shadow-sm">
        <FileIcon type={file.type} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-card-foreground">
            {file.name}
          </p>
        </div>
        <span className="hidden text-xs text-muted-foreground sm:block">
          {file.modified}
        </span>
        <span className="text-xs text-muted-foreground">{file.size}</span>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all duration-200 hover:bg-accent hover:text-foreground group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">File options</span>
          </button>
          {menuOpen && <ContextMenu onClose={() => setMenuOpen(false)} />}
        </div>
      </div>
    )
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:border-primary/20 hover:shadow-md">
      {/* Card body */}
      <div className="flex flex-col items-center gap-3 px-4 pb-3 pt-6">
        <FileIcon type={file.type} size="lg" />
        <div className="w-full text-center">
          <p className="truncate text-sm font-medium text-card-foreground">
            {file.name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{file.size}</p>
        </div>
      </div>

      {/* Card footer */}
      <div className="flex items-center justify-between border-t border-border bg-secondary/50 px-4 py-2.5">
        <span className="text-xs text-muted-foreground">{file.modified}</span>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-1 text-muted-foreground opacity-0 transition-all duration-200 hover:bg-accent hover:text-foreground group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">File options</span>
          </button>
          {menuOpen && <ContextMenu onClose={() => setMenuOpen(false)} />}
        </div>
      </div>
    </div>
  )
}

function ContextMenu({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-lg">
      <button
        onClick={onClose}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent"
      >
        <Download className="h-4 w-4" />
        Download
      </button>
      <button
        onClick={onClose}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent"
      >
        <Pencil className="h-4 w-4" />
        Rename
      </button>
      <button
        onClick={onClose}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
    </div>
  )
}
