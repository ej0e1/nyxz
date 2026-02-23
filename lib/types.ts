/**
 * Torrent item from qBittorrent Web API.
 */
export type TorrentItem = {
  hash: string
  name: string
  size: number
  progress: number
  dlspeed: number
  upspeed: number
  ratio: number
  state: string
}
