export type VideoProvider =
  | 'youtube'
  | 'vimeo'
  | 'loom'
  | 'dailymotion'
  | 'wistia'
  | 'twitch'
  | 'file'

export type VideoAspect = '16:9' | '4:3' | '1:1' | '9:16' | '21:9'
export type VideoAlign = 'left' | 'center' | 'right'

export interface ParsedVideo {
  src: string
  provider: VideoProvider
  videoId: string
  label: string
}

export interface VideoAttributes {
  src: string
  provider: VideoProvider
  videoId: string
  aspect: VideoAspect
  width: number
  align: VideoAlign
  caption: string
  start: number
  autoplay: boolean
  muted: boolean
  privacy: boolean
  title: string
}

const PROVIDER_LABELS: Record<VideoProvider, string> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  loom: 'Loom',
  dailymotion: 'Dailymotion',
  wistia: 'Wistia',
  twitch: 'Twitch',
  file: 'Video file',
}

const FILE_PATTERN = /\.(mp4|webm|ogg|ogv|m4v|mov)(?:$|[?#])/i

function toUrl(raw: string): URL | null {
  const value = raw.trim()
  if (!value) return null
  const normalized = value.startsWith('//')
    ? `https:${value}`
    : /^https?:\/\//i.test(value)
      ? value
      : `https://${value}`
  try {
    const url = new URL(normalized)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url
  } catch {
    return null
  }
}

function fromPath(url: URL, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = url.pathname.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

function parseYouTube(url: URL): ParsedVideo | null {
  const host = url.hostname.replace(/^www\./, '')
  const isYoutube =
    host === 'youtu.be' ||
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com' ||
    host === 'youtube-nocookie.com'
  if (!isYoutube) return null

  let id = ''
  if (host === 'youtu.be') {
    id = url.pathname.split('/').filter(Boolean)[0] ?? ''
  } else if (url.pathname === '/watch') {
    id = url.searchParams.get('v') ?? ''
  } else {
    id =
      fromPath(url, [
        /^\/embed\/([\w-]{6,})/,
        /^\/shorts\/([\w-]{6,})/,
        /^\/live\/([\w-]{6,})/,
        /^\/v\/([\w-]{6,})/,
      ]) ?? ''
  }
  if (!/^[\w-]{6,}$/.test(id)) return null
  return {
    src: `https://www.youtube.com/watch?v=${id}`,
    provider: 'youtube',
    videoId: id,
    label: PROVIDER_LABELS.youtube,
  }
}

function parseVimeo(url: URL): ParsedVideo | null {
  if (!/(^|\.)vimeo\.com$/.test(url.hostname)) return null
  const direct = fromPath(url, [/^\/video\/(\d+)/, /^\/channels\/[^/]+\/(\d+)/])
  const segments = url.pathname.split('/').filter(Boolean)
  const numeric = [...segments].reverse().find((part) => /^\d{5,}$/.test(part))
  const id = direct ?? numeric
  if (!id) return null
  return {
    src: `https://vimeo.com/${id}`,
    provider: 'vimeo',
    videoId: id,
    label: PROVIDER_LABELS.vimeo,
  }
}

function parseLoom(url: URL): ParsedVideo | null {
  if (!/(^|\.)loom\.com$/.test(url.hostname)) return null
  const id = fromPath(url, [/^\/share\/([\w-]+)/, /^\/embed\/([\w-]+)/, /^\/v\/([\w-]+)/])
  if (!id) return null
  return {
    src: `https://www.loom.com/share/${id}`,
    provider: 'loom',
    videoId: id,
    label: PROVIDER_LABELS.loom,
  }
}

function parseDailymotion(url: URL): ParsedVideo | null {
  const host = url.hostname.replace(/^www\./, '')
  if (host !== 'dai.ly' && host !== 'dailymotion.com') return null
  const id =
    host === 'dai.ly'
      ? url.pathname.split('/').filter(Boolean)[0]
      : fromPath(url, [/^\/video\/([\w]+)/, /^\/embed\/video\/([\w]+)/])
  if (!id) return null
  return {
    src: `https://www.dailymotion.com/video/${id}`,
    provider: 'dailymotion',
    videoId: id,
    label: PROVIDER_LABELS.dailymotion,
  }
}

function parseWistia(url: URL): ParsedVideo | null {
  const host = url.hostname.replace(/^www\./, '')
  if (!/wistia\.(com|net)$/.test(host) && !/\.wistia\.com$/.test(host)) return null
  const id = fromPath(url, [/^\/medias\/([\w]+)/, /^\/embed\/iframe\/([\w]+)/, /^\/embed\/medias\/([\w]+)/])
  if (!id) return null
  return {
    src: url.toString(),
    provider: 'wistia',
    videoId: id,
    label: PROVIDER_LABELS.wistia,
  }
}

function parseTwitch(url: URL): ParsedVideo | null {
  const host = url.hostname.replace(/^www\./, '')

  if (host === 'player.twitch.tv') {
    const video = url.searchParams.get('video')
    if (video) {
      return {
        src: `https://www.twitch.tv/videos/${video}`,
        provider: 'twitch',
        videoId: `video:${video}`,
        label: PROVIDER_LABELS.twitch,
      }
    }
    const channel = url.searchParams.get('channel')
    if (channel) {
      return {
        src: `https://www.twitch.tv/${channel}`,
        provider: 'twitch',
        videoId: `channel:${channel}`,
        label: PROVIDER_LABELS.twitch,
      }
    }
    return null
  }

  if (host === 'clips.twitch.tv' && url.pathname === '/embed') {
    const clip = url.searchParams.get('clip')
    if (!clip) return null
    return {
      src: `https://clips.twitch.tv/${clip}`,
      provider: 'twitch',
      videoId: `clip:${clip}`,
      label: PROVIDER_LABELS.twitch,
    }
  }

  if (host !== 'twitch.tv' && host !== 'clips.twitch.tv') return null
  const segments = url.pathname.split('/').filter(Boolean)

  if (host === 'clips.twitch.tv' && segments[0]) {
    return {
      src: `https://clips.twitch.tv/${segments[0]}`,
      provider: 'twitch',
      videoId: `clip:${segments[0]}`,
      label: PROVIDER_LABELS.twitch,
    }
  }

  const clipIndex = segments.indexOf('clip')
  if (clipIndex > 0 && segments[clipIndex + 1]) {
    const slug = segments[clipIndex + 1]
    return {
      src: url.toString(),
      provider: 'twitch',
      videoId: `clip:${slug}`,
      label: PROVIDER_LABELS.twitch,
    }
  }

  if (segments[0] === 'videos' && segments[1] && /^\d+$/.test(segments[1])) {
    return {
      src: url.toString(),
      provider: 'twitch',
      videoId: `video:${segments[1]}`,
      label: PROVIDER_LABELS.twitch,
    }
  }

  const channel = segments[0]
  const ignored = new Set(['directory', 'search', 'settings', 'downloads', 'p'])
  if (channel && !ignored.has(channel) && segments.length === 1) {
    return {
      src: `https://www.twitch.tv/${channel}`,
      provider: 'twitch',
      videoId: `channel:${channel}`,
      label: PROVIDER_LABELS.twitch,
    }
  }
  return null
}

function parseFile(url: URL): ParsedVideo | null {
  if (!FILE_PATTERN.test(`${url.pathname}${url.search}`)) return null
  return {
    src: url.toString(),
    provider: 'file',
    videoId: url.pathname.split('/').pop() ?? 'video',
    label: PROVIDER_LABELS.file,
  }
}

/**
 * Parses a URL or an iframe embed snippet into a known video provider.
 */
export function parseVideoUrl(raw: string): ParsedVideo | null {
  const value = raw.trim()
  if (!value) return null

  if (/^<iframe/i.test(value)) {
    const document = new DOMParser().parseFromString(value, 'text/html')
    const src = document.querySelector('iframe[src]')?.getAttribute('src')
    if (!src) return null
    return parseVideoUrl(src)
  }

  const url = toUrl(value)
  if (!url) return null
  return (
    parseYouTube(url) ??
    parseVimeo(url) ??
    parseLoom(url) ??
    parseDailymotion(url) ??
    parseWistia(url) ??
    parseTwitch(url) ??
    parseFile(url)
  )
}

/** Finds a supported video in a paste/drop payload (HTML iframe or link). */
export function parseVideoFromTransfer(transfer: DataTransfer | null): ParsedVideo | null {
  if (!transfer) return null
  const html = transfer.getData('text/html')
  const text = transfer.getData('text/plain').trim()

  if (html) {
    const document = new DOMParser().parseFromString(html, 'text/html')
    const iframeSrc = document.querySelector('iframe[src]')?.getAttribute('src')
    if (iframeSrc) {
      const parsed = parseVideoUrl(iframeSrc)
      if (parsed) return parsed
    }
    const anchorHref = document.querySelector('a[href]')?.getAttribute('href')
    if (anchorHref) {
      const parsed = parseVideoUrl(anchorHref)
      if (parsed) return parsed
    }
  }

  if (text && !/\s/.test(text)) {
    return parseVideoUrl(text)
  }
  return null
}

export function providerLabel(provider: VideoProvider): string {
  return PROVIDER_LABELS[provider] ?? 'Video'
}

export function defaultVideoAttrs(
  parsed: ParsedVideo,
  overrides: Partial<VideoAttributes> = {},
): VideoAttributes {
  return {
    src: parsed.src,
    provider: parsed.provider,
    videoId: parsed.videoId,
    aspect: '16:9',
    width: 100,
    align: 'center',
    caption: '',
    start: 0,
    autoplay: false,
    muted: false,
    privacy: true,
    title: `${parsed.label} video`,
    ...overrides,
  }
}

function currentParentHost(): string {
  if (typeof window === 'undefined') return 'localhost'
  return window.location.hostname || 'localhost'
}

/**
 * Builds the actual player URL from the stored node attributes.
 */
export function buildVideoEmbedUrl(attrs: VideoAttributes): string {
  const start = Math.max(0, Math.floor(attrs.start || 0))
  const autoplay = attrs.autoplay
  const muted = attrs.muted || autoplay

  switch (attrs.provider) {
    case 'youtube': {
      const host = attrs.privacy ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com'
      const params = new URLSearchParams({
        rel: '0',
        modestbranding: '1',
        playsinline: '1',
      })
      if (start > 0) params.set('start', String(start))
      if (autoplay) {
        params.set('autoplay', '1')
        params.set('mute', '1')
      }
      return `${host}/embed/${attrs.videoId}?${params.toString()}`
    }
    case 'vimeo': {
      const params = new URLSearchParams()
      if (autoplay) {
        params.set('autoplay', '1')
        params.set('muted', muted ? '1' : '0')
      }
      const query = params.size > 0 ? `?${params.toString()}` : ''
      const fragment = start > 0 ? `#t=${start}s` : ''
      return `https://player.vimeo.com/video/${attrs.videoId}${query}${fragment}`
    }
    case 'loom': {
      const fragment = start > 0 ? `#t=${start}` : ''
      return `https://www.loom.com/embed/${attrs.videoId}${fragment}`
    }
    case 'dailymotion': {
      const params = new URLSearchParams()
      if (start > 0) params.set('start', String(start))
      if (autoplay) {
        params.set('autoplay', '1')
        params.set('mute', '1')
      }
      const query = params.size > 0 ? `?${params.toString()}` : ''
      return `https://www.dailymotion.com/embed/video/${attrs.videoId}${query}`
    }
    case 'wistia':
      return `https://fast.wistia.net/embed/iframe/${attrs.videoId}?videoFoam=true&wmode=opaque`
    case 'twitch': {
      const parent = encodeURIComponent(currentParentHost())
      const [kind, id] = attrs.videoId.split(':')
      if (kind === 'clip') {
        return `https://clips.twitch.tv/embed?clip=${encodeURIComponent(id ?? '')}&parent=${parent}`
      }
      if (kind === 'video') {
        return `https://player.twitch.tv/?video=${encodeURIComponent(id ?? '')}&parent=${parent}&autoplay=false`
      }
      return `https://player.twitch.tv/?channel=${encodeURIComponent(id ?? '')}&parent=${parent}&autoplay=false`
    }
    case 'file': {
      if (start <= 0) return attrs.src
      const hashIndex = attrs.src.indexOf('#')
      const base = hashIndex >= 0 ? attrs.src.slice(0, hashIndex) : attrs.src
      return `${base}#t=${start}`
    }
    default:
      return attrs.src
  }
}

export function parseStartTime(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return 0
  if (/^\d+$/.test(trimmed)) return Number(trimmed)
  const parts = trimmed.split(':')
  if (parts.length < 2 || parts.length > 3) return null
  const numbers = parts.map((part) => Number(part))
  if (numbers.some((number) => !Number.isFinite(number) || number < 0)) return null
  if (parts.length === 2) return numbers[0] * 60 + numbers[1]
  return numbers[0] * 3600 + numbers[1] * 60 + numbers[2]
}

export function formatStartTime(seconds: number): string {
  if (!seconds || seconds <= 0) return ''
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const paddedSeconds = String(secs).padStart(2, '0')
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${paddedSeconds}`
  return `${minutes}:${paddedSeconds}`
}
