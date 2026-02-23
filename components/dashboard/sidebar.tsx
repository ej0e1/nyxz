"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FolderOpen,
  Clock,
  Trash2,
  Settings,
  LogOut,
  Cloud,
  X,
} from "lucide-react"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: FolderOpen, label: "My Files", href: "/my-files" },
  { icon: Clock, label: "Recent", href: null },
  { icon: Trash2, label: "Trash", href: null },
  { icon: Settings, label: "Settings", href: null },
]

interface SidebarProps {
  activeItem: string
  onItemClick: (label: string) => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({
  activeItem,
  onItemClick,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname()
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-border bg-sidebar transition-transform duration-300 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Cloud className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
              CloudVault
            </span>
          </Link>
          <button
            onClick={onMobileClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close sidebar</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive =
                activeItem === item.label ||
                (item.href && pathname === item.href)
              const content = (
                <>
                  <item.icon className="h-[18px] w-[18px]" />
                  {item.label}
                </>
              )
              const className = cn(
                "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
              return (
                <li key={item.label}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={onMobileClose}
                      className={className}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      onClick={() => {
                        onItemClick(item.label)
                        onMobileClose()
                      }}
                      className={className}
                    >
                      {content}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="border-t border-border px-3 py-4">
          <button className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive">
            <LogOut className="h-[18px] w-[18px]" />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}
