/**
 * Server-side qBittorrent API client.
 * Handles nginx Basic Auth + qBittorrent cookie-based auth.
 */

const COOKIE_TTL_MS = 30 * 60 * 1000 // 30 min
const REQUEST_TIMEOUT_MS = 15000 // 15 seconds
const USER_AGENT = "Mozilla/5.0"

let cachedCookie: string | null = null
let cookieExpiry = 0

function getBaseUrl(): string {
  const base = process.env.QBIT_BASE_URL
  if (!base) {
    console.error("[qbit] QBIT_BASE_URL is not configured")
    throw new Error("QBIT_BASE_URL is not configured")
  }
  return base.replace(/\/$/, "")
}

function getCredentials(): { user: string; pass: string } {
  const user = process.env.QBIT_USER
  const pass = process.env.QBIT_PASS
  if (!user || !pass) {
    console.error("[qbit] QBIT_USER and QBIT_PASS must be set")
    throw new Error("QBIT_USER and QBIT_PASS must be set")
  }
  return { user, pass }
}

/**
 * Generate Basic Auth header for nginx auth_basic.
 */
function getBasicAuthHeader(): string {
  const { user, pass } = getCredentials()
  const encoded = Buffer.from(`${user}:${pass}`).toString("base64")
  return `Basic ${encoded}`
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = REQUEST_TIMEOUT_MS, ...init } = options
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
    })
    return res
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const cause = err instanceof Error ? err.cause : undefined
    console.error("[qbit] fetch failed:", { url, msg, cause })
    throw new Error(
      cause instanceof Error ? `${msg}: ${cause.message}` : msg
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Login to qBittorrent and return session cookie.
 * Uses Content-Type: application/x-www-form-urlencoded and URLSearchParams.
 */
async function login(): Promise<string> {
  if (cachedCookie && Date.now() < cookieExpiry) {
    return cachedCookie
  }

  const base = getBaseUrl()
  const { user, pass } = getCredentials()

  const loginUrl = `${base}/api/v2/auth/login`
  const url = new URL(loginUrl)
  const referer = `${url.protocol}//${url.host}/`

  const body = new URLSearchParams({
    username: user,
    password: pass,
  }).toString()

  console.log("[qbit] Logging in to", loginUrl)

  const res = await fetchWithTimeout(loginUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: getBasicAuthHeader(),
      "User-Agent": USER_AGENT,
      Referer: `${referer}qbittorrent/`,
      Host: url.host,
    },
    body,
    timeout: REQUEST_TIMEOUT_MS,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    console.error("[qbit] Login failed:", res.status, text)
    throw new Error(`qBittorrent login failed: ${res.status} ${res.statusText}`)
  }

  const text = await res.text()
  if (text !== "Ok.") {
    console.error("[qbit] Login rejected:", text)
    throw new Error(`qBittorrent login failed: ${text}`)
  }

  const setCookie = res.headers.get("set-cookie")
  if (!setCookie) {
    console.error("[qbit] No session cookie in response")
    throw new Error("qBittorrent login did not return a session cookie")
  }

  const sidMatch = setCookie.match(/SID=([^;]+)/)
  if (!sidMatch) {
    console.error("[qbit] Could not parse cookie:", setCookie)
    throw new Error("Could not parse session cookie from qBittorrent")
  }

  cachedCookie = `SID=${sidMatch[1]}`
  cookieExpiry = Date.now() + COOKIE_TTL_MS
  console.log("[qbit] Login successful")
  return cachedCookie
}

export function clearSessionCache(): void {
  cachedCookie = null
  cookieExpiry = 0
}

/**
 * Get torrent list from qBittorrent.
 * Logs in first, then fetches /api/v2/torrents/info with Cookie header.
 */
export async function getTorrents(): Promise<unknown[]> {
  const base = getBaseUrl()
  const cookie = await login()

  const infoUrl = `${base}/api/v2/torrents/info`
  const url = new URL(infoUrl)
  const referer = `${url.protocol}//${url.host}/`

  console.log("[qbit] Fetching torrents from", infoUrl)

  const res = await fetchWithTimeout(infoUrl, {
    method: "GET",
    headers: {
      Authorization: getBasicAuthHeader(),
      Cookie: cookie,
      "User-Agent": USER_AGENT,
      Referer: `${referer}qbittorrent/`,
      Host: url.host,
    },
    timeout: REQUEST_TIMEOUT_MS,
  })

  if (res.status === 403) {
    clearSessionCache()
    console.error("[qbit] 403 Forbidden - session expired")
    throw new Error("Session expired, please retry")
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    console.error("[qbit] torrents/info failed:", res.status, text)
    throw new Error(
      `qBittorrent API error: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`
    )
  }

  const data = await res.json()
  console.log("[qbit] Fetched", Array.isArray(data) ? data.length : 0, "torrents")
  return Array.isArray(data) ? data : []
}

// --- Legacy exports for other routes ---

export async function getSessionCookie(): Promise<string> {
  return login()
}

async function qbitRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const base = getBaseUrl()
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`
  const cookie = await login()
  const urlObj = new URL(url)
  const referer = `${urlObj.protocol}//${urlObj.host}/`

  const res = await fetchWithTimeout(url, {
    ...options,
    headers: {
      Authorization: getBasicAuthHeader(),
      Cookie: cookie,
      "User-Agent": USER_AGENT,
      Referer: referer,
      Host: urlObj.host,
      ...options.headers,
    },
    timeout: REQUEST_TIMEOUT_MS,
  })

  if (res.status === 403) {
    clearSessionCache()
  }

  return res
}

export async function qbitGet<T>(path: string): Promise<T> {
  const res = await qbitRequest(path)
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(
      `qBittorrent API error: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`
    )
  }
  return res.json() as Promise<T>
}

export async function qbitPost(
  path: string,
  params: Record<string, string>
): Promise<void> {
  const body = new URLSearchParams(params).toString()
  const res = await qbitRequest(path, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(
      `qBittorrent API error: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`
    )
  }
}

export async function qbitPostForm(
  path: string,
  formData: FormData
): Promise<string> {
  const res = await qbitRequest(path, {
    method: "POST",
    body: formData,
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(
      `qBittorrent API error: ${res.status} ${res.statusText} - ${text}`
    )
  }
  return text
}
