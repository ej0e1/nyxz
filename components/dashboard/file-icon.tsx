import {
  Folder,
  Film,
  Music,
  Image,
  FileText,
  Archive,
  Magnet,
} from "lucide-react"

const iconMap = {
  folder: { icon: Folder, bg: "bg-primary/10", color: "text-primary" },
  video: { icon: Film, bg: "bg-rose-50", color: "text-rose-500" },
  audio: { icon: Music, bg: "bg-amber-50", color: "text-amber-500" },
  image: { icon: Image, bg: "bg-emerald-50", color: "text-emerald-500" },
  document: { icon: FileText, bg: "bg-sky-50", color: "text-sky-500" },
  archive: { icon: Archive, bg: "bg-orange-50", color: "text-orange-500" },
  torrent: { icon: Magnet, bg: "bg-primary/10", color: "text-primary" },
} as const

interface FileIconProps {
  type: keyof typeof iconMap
  size?: "sm" | "md" | "lg"
}

export function FileIcon({ type, size = "md" }: FileIconProps) {
  const config = iconMap[type] || iconMap.document
  const Icon = config.icon

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
  }

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-7 w-7",
  }

  return (
    <div
      className={`flex ${sizeClasses[size]} items-center justify-center rounded-xl ${config.bg}`}
    >
      <Icon className={`${iconSizes[size]} ${config.color}`} />
    </div>
  )
}
