export type BookmarkAlign = 'left' | 'center' | 'right'

export interface BookmarkAttributes {
  url: string
  title: string
  description: string
  image: string
  favicon: string
  domain: string
  siteName: string
  width: number
  align: BookmarkAlign
}

export interface BookmarkMetadata {
  url: string
  title: string
  description: string
  image: string
  favicon: string
  domain: string
  siteName: string
}

const METADATA_ENDPOINT = 'https://api.microlink.io/'
const FAVICON_ENDPOINT = 'https://www.google.com/s2/favicons'
const MAX_TEXT = 320

function cleanText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT)
}

export function isSafeHttpUrl(raw: string): boolean {
  const value = raw.trim()
  if (!value) return false
  const normalized = value.startsWith('//')
    ? `https:${value}`
    : /^https?:\/\//i.test(value)
      ? value
      : `https://${value}`
  try {
    const url = new URL(normalized)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function normalizeBookmarkUrl(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  const normalized = value.startsWith('//')
    ? `https:${value}`
    : /^https?:\/\//i.test(value)
      ? value
      : `https://${value}`
  if (!isSafeHttpUrl(normalized)) return null
  try {
    const url = new URL(normalized)
    // Never store credentials in a bookmark card.
    url.username = ''
    url.password = ''
    return url.toString()
  } catch {
    return null
  }
}

export function bookmarkDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function faviconFor(domain: string): string {
  if (!domain) return ''
  return `${FAVICON_ENDPOINT}?domain=${encodeURIComponent(domain)}&sz=64`
}

export function fallbackBookmarkMetadata(url: string): BookmarkMetadata {
  const domain = bookmarkDomain(url)
  return {
    url,
    title: domain || url,
    description: url,
    image: '',
    favicon: faviconFor(domain),
    domain,
    siteName: domain,
  }
}

function safeImage(value: unknown): string {
  if (typeof value === 'string' && isSafeHttpUrl(value)) return value
  if (value && typeof value === 'object' && 'url' in value) {
    const url = (value as { url?: unknown }).url
    if (typeof url === 'string' && isSafeHttpUrl(url)) return url
  }
  return ''
}

/**
 * Fetches Open Graph metadata through Microlink's public, CORS-friendly API.
 * If the service is unavailable (or the site blocks it), the caller still gets
 * a usable fallback card with the domain, URL and favicon.
 */
export async function fetchBookmarkMetadata(
  raw: string,
  signal?: AbortSignal,
): Promise<BookmarkMetadata> {
  const url = normalizeBookmarkUrl(raw)
  if (!url) throw new Error('Invalid URL')

  const fallback = fallbackBookmarkMetadata(url)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  try {
    const endpoint = new URL(METADATA_ENDPOINT)
    endpoint.searchParams.set('url', url)
    const response = await fetch(endpoint.toString(), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return fallback

    const payload = (await response.json()) as {
      data?: {
        title?: unknown
        description?: unknown
        image?: unknown
        logo?: unknown
        publisher?: unknown
      }
    }
    const data = payload.data ?? {}

    return {
      url,
      title: cleanText(data.title) || fallback.title,
      description: cleanText(data.description) || fallback.description,
      image: safeImage(data.image),
      favicon: safeImage(data.logo) || fallback.favicon,
      domain: fallback.domain,
      siteName: cleanText(data.publisher) || fallback.siteName,
    }
  } catch {
    return fallback
  } finally {
    clearTimeout(timeout)
  }
}

export function defaultBookmarkAttrs(
  metadata: BookmarkMetadata,
  overrides: Partial<BookmarkAttributes> = {},
): BookmarkAttributes {
  return {
    url: metadata.url,
    title: metadata.title,
    description: metadata.description,
    image: metadata.image,
    favicon: metadata.favicon,
    domain: metadata.domain,
    siteName: metadata.siteName,
    width: 100,
    align: 'center',
    ...overrides,
  }
}
