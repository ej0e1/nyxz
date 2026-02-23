export type FileItem = {
  id: string
  name: string
  type: "folder" | "video" | "audio" | "image" | "document" | "archive" | "torrent"
  size: string
  modified: string
  isFolder: boolean
}

export const files: FileItem[] = [
  {
    id: "1",
    name: "Movies",
    type: "folder",
    size: "45.2 GB",
    modified: "Feb 20, 2026",
    isFolder: true,
  },
  {
    id: "2",
    name: "TV Shows",
    type: "folder",
    size: "128.5 GB",
    modified: "Feb 18, 2026",
    isFolder: true,
  },
  {
    id: "3",
    name: "Music",
    type: "folder",
    size: "12.8 GB",
    modified: "Feb 15, 2026",
    isFolder: true,
  },
  {
    id: "4",
    name: "Documents",
    type: "folder",
    size: "2.3 GB",
    modified: "Feb 22, 2026",
    isFolder: true,
  },
  {
    id: "5",
    name: "Project_Final_v2.mp4",
    type: "video",
    size: "1.8 GB",
    modified: "Feb 21, 2026",
    isFolder: false,
  },
  {
    id: "6",
    name: "Presentation_Q1.pdf",
    type: "document",
    size: "24.5 MB",
    modified: "Feb 19, 2026",
    isFolder: false,
  },
  {
    id: "7",
    name: "album_cover.png",
    type: "image",
    size: "3.2 MB",
    modified: "Feb 17, 2026",
    isFolder: false,
  },
  {
    id: "8",
    name: "podcast_ep42.mp3",
    type: "audio",
    size: "85.6 MB",
    modified: "Feb 16, 2026",
    isFolder: false,
  },
  {
    id: "9",
    name: "backup_2026.zip",
    type: "archive",
    size: "4.7 GB",
    modified: "Feb 14, 2026",
    isFolder: false,
  },
  {
    id: "10",
    name: "design_assets.zip",
    type: "archive",
    size: "890 MB",
    modified: "Feb 13, 2026",
    isFolder: false,
  },
  {
    id: "11",
    name: "conference_keynote.mp4",
    type: "video",
    size: "2.4 GB",
    modified: "Feb 12, 2026",
    isFolder: false,
  },
  {
    id: "12",
    name: "annual_report.pdf",
    type: "document",
    size: "18.3 MB",
    modified: "Feb 10, 2026",
    isFolder: false,
  },
]

export const storageUsed = 350 // in GB
export const storageTotal = 1000 // in GB
