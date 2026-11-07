export type AudioProvider =
  | 'spotify'
  | 'soundcloud'
  | 'apple-podcasts'
  | 'apple-music'
  | 'mixcloud'
  | 'deezer'
  | 'tidal'
  | 'file'

export type AudioAlign = 'left' | 'center' | 'right'

export interface ParsedAudio {
  src: string
  provider: AudioProvider
  audioId: string
  title: string
  height: number
  label: string
}

export interface AudioAttributes {
  src: string
  provider: AudioProvider
  audioId: string
  title: string
  height: number
  width: number
  align: AudioAlign
  caption: string
}

const PROVIDER_LABELS: Record<AudioProvider, string> = {
  spotify: 'Spotify',
  soundcloud: 'SoundCloud',
  'apple-podcasts': 'Apple Podcasts',
  'apple-music': 'Apple Music',
  mixcloud: 'Mixcloud',
  deezer: 'Deezer',
  tidal: 'Tidal',
  file: 'Audio file',
}

const DEFAULT_HEIGHTS: Record<AudioProvider, number> = {
  spotify: 152,
  soundcloud: 166,
  'apple-podcasts': 175,
  'apple-music': 175,
  mixcloud: 120,
  deezer: 300,
  tidal: 300,
  file: 96,
}

const FILE_PATTERN =
  /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|weba|webm|m3u8|aif|aiff|caf)(?:$|[?#])/i

const AUDIO_TYPES = new Set([
  'track',
  'album',
  'playlist',
  'episode',
  'show',
  'artist',
])

const TYPE_ALIASES: Record<string, string> = {
  tracks: 'track',
  albums: 'album',
  playlists: 'playlist',
  episodes: 'episode',
  shows: 'show',
  artists: 'artist',
}

function normalizeType(type: string): string {
  return TYPE_ALIASES[type] ?? type
}

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
    url.username = ''
    url.password = ''
    return url
  } catch {
    return null
  }
}

function findTypeAndId(segments: string[]): { type: string; id: string } | null {
  for (let index = 0; index < segments.length - 1; index += 1) {
    const type = normalizeType(segments[index])
    if (!AUDIO_TYPES.has(type)) continue
    const id = segments[index + 1]
    if (id) return { type, id }
  }
  return null
}

function parseSpotifyUri(raw: string): ParsedAudio | null {
  const match = raw
    .trim()
    .match(/^spotify:(track|album|playlist|episode|show|artist):([\w-]+)$/i)
  if (!match) return null
  const type = match[1].toLowerCase()
  const id = match[2]
  return {
    src: `https://open.spotify.com/${type}/${id}`,
    provider: 'spotify',
    audioId: `${type}:${id}`,
    title: `Spotify ${type}`,
    height: type === 'track' || type === 'episode' ? 152 : 352,
    label: PROVIDER_LABELS.spotify,
  }
}

function parseSpotify(url: URL): ParsedAudio | null {
  const host = url.hostname.replace(/^www\./, '')
  if (host !== 'open.spotify.com' && host !== 'play.spotify.com') return null
  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.some((segment) => ['search', 'genre', 'collection', 'browse'].includes(segment))) {
    return null
  }
  const found = findTypeAndId(segments)
  if (!found) return null
  const { type, id } = found
  return {
    src: `https://open.spotify.com/${type}/${id}`,
    provider: 'spotify',
    audioId: `${type}:${id}`,
    title: `Spotify ${type}`,
    height: type === 'track' || type === 'episode' ? 152 : 352,
    label: PROVIDER_LABELS.spotify,
  }
}

function parseSoundCloud(url: URL): ParsedAudio | null {
  const host = url.hostname.replace(/^www\./, '')
  if (host === 'w.soundcloud.com' && url.pathname === '/player') {
    const feed = url.searchParams.get('url')
    if (!feed) return null
    const feedUrl = toUrl(feed)
    if (!feedUrl) return null
    return {
      src: feedUrl.toString(),
      provider: 'soundcloud',
      audioId: feedUrl.pathname,
      title: 'SoundCloud audio',
      height: DEFAULT_HEIGHTS.soundcloud,
      label: PROVIDER_LABELS.soundcloud,
    }
  }
  if (
    host !== 'soundcloud.com' &&
    host !== 'on.soundcloud.com' &&
    host !== 'm.soundcloud.com'
  ) {
    return null
  }
  return {
    src: url.toString(),
    provider: 'soundcloud',
    audioId: url.pathname,
    title: 'SoundCloud audio',
    height: DEFAULT_HEIGHTS.soundcloud,
    label: PROVIDER_LABELS.soundcloud,
  }
}

function parseApplePodcasts(url: URL): ParsedAudio | null {
  const host = url.hostname.replace(/^www\./, '')
  if (host !== 'podcasts.apple.com' && host !== 'embed.podcasts.apple.com') {
    return null
  }
  const src = new URL(url.toString())
  src.hostname = 'podcasts.apple.com'
  return {
    src: src.toString(),
    provider: 'apple-podcasts',
    audioId: src.pathname,
    title: 'Apple Podcasts',
    height: DEFAULT_HEIGHTS['apple-podcasts'],
    label: PROVIDER_LABELS['apple-podcasts'],
  }
}

function parseAppleMusic(url: URL): ParsedAudio | null {
  const host = url.hostname.replace(/^www\./, '')
  if (host !== 'music.apple.com' && host !== 'embed.music.apple.com') {
    return null
  }
  const src = new URL(url.toString())
  src.hostname = 'music.apple.com'
  return {
    src: src.toString(),
    provider: 'apple-music',
    audioId: src.pathname,
    title: 'Apple Music',
    height: DEFAULT_HEIGHTS['apple-music'],
    label: PROVIDER_LABELS['apple-music'],
  }
}

function parseMixcloud(url: URL): ParsedAudio | null {
  const host = url.hostname.replace(/^www\./, '')
  if (host !== 'mixcloud.com' && host !== 'm.mixcloud.com') return null
  if (url.pathname === '/widget/iframe') {
    const feed = url.searchParams.get('feed')
    if (!feed) return null
    const feedUrl = toUrl(feed)
    if (!feedUrl) return null
    return {
      src: feedUrl.toString(),
      provider: 'mixcloud',
      audioId: feedUrl.pathname,
      title: 'Mixcloud show',
      height: DEFAULT_HEIGHTS.mixcloud,
      label: PROVIDER_LABELS.mixcloud,
    }
  }
  return {
    src: url.toString(),
    provider: 'mixcloud',
    audioId: url.pathname,
    title: 'Mixcloud show',
    height: DEFAULT_HEIGHTS.mixcloud,
    label: PROVIDER_LABELS.mixcloud,
  }
}

function parseDeezer(url: URL): ParsedAudio | null {
  const host = url.hostname.replace(/^www\./, '')
  if (host !== 'deezer.com' && host !== 'widget.deezer.com') return null
  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.some((segment) => ['search', 'profile'].includes(segment))) {
    return null
  }
  const found = findTypeAndId(segments)
  if (!found) return null
  const { type, id } = found
  return {
    src: `https://www.deezer.com/${type}/${id}`,
    provider: 'deezer',
    audioId: `${type}:${id}`,
    title: `Deezer ${type}`,
    height: DEFAULT_HEIGHTS.deezer,
    label: PROVIDER_LABELS.deezer,
  }
}

function parseTidal(url: URL): ParsedAudio | null {
  const host = url.hostname.replace(/^www\./, '')
  if (
    host !== 'tidal.com' &&
    host !== 'listen.tidal.com' &&
    host !== 'embed.tidal.com'
  ) {
    return null
  }
  const segments = url.pathname.split('/').filter(Boolean)
  const found = findTypeAndId(segments)
  if (!found) return null
  const { type, id } = found
  return {
    src: `https://tidal.com/browse/${type}/${id}`,
    provider: 'tidal',
    audioId: `${type}:${id}`,
    title: `Tidal ${type}`,
    height: DEFAULT_HEIGHTS.tidal,
    label: PROVIDER_LABELS.tidal,
  }
}

function parseFile(url: URL): ParsedAudio | null {
  if (!FILE_PATTERN.test(`${url.pathname}${url.search}`)) return null
  const filename = decodeURIComponent(url.pathname.split('/').pop() ?? 'audio')
  const title = filename.replace(/\.[^.]+$/, '') || 'Audio file'
  return {
    src: url.toString(),
    provider: 'file',
    audioId: filename,
    title,
    height: DEFAULT_HEIGHTS.file,
    label: PROVIDER_LABELS.file,
  }
}

/**
 * Parses a URL, Spotify URI or iframe embed snippet into a supported audio
 * provider. Direct audio files are detected by extension.
 */
export function parseAudioUrl(raw: string): ParsedAudio | null {
  const value = raw.trim()
  if (!value) return null

  if (/^spotify:/i.test(value)) {
    return parseSpotifyUri(value)
  }

  if (/^<iframe/i.test(value)) {
    const document = new DOMParser().parseFromString(value, 'text/html')
    const src = document.querySelector('iframe[src]')?.getAttribute('src')
    if (!src) return null
    return parseAudioUrl(src)
  }

  const url = toUrl(value)
  if (!url) return null
  return (
    parseSpotify(url) ??
    parseSoundCloud(url) ??
    parseApplePodcasts(url) ??
    parseAppleMusic(url) ??
    parseMixcloud(url) ??
    parseDeezer(url) ??
    parseTidal(url) ??
    parseFile(url)
  )
}

/** Finds a supported audio embed in a paste/drop payload. */
export function parseAudioFromTransfer(
  transfer: DataTransfer | null,
): ParsedAudio | null {
  if (!transfer) return null
  const html = transfer.getData('text/html')
  const text = transfer.getData('text/plain').trim()

  if (html) {
    const document = new DOMParser().parseFromString(html, 'text/html')
    const iframeSrc = document.querySelector('iframe[src]')?.getAttribute('src')
    if (iframeSrc) {
      const parsed = parseAudioUrl(iframeSrc)
      if (parsed) return parsed
    }
    const anchorHref = document.querySelector('a[href]')?.getAttribute('href')
    if (anchorHref) {
      const parsed = parseAudioUrl(anchorHref)
      if (parsed) return parsed
    }
  }

  if (text && !/\s/.test(text)) {
    return parseAudioUrl(text)
  }
  return null
}

export function providerLabel(provider: AudioProvider): string {
  return PROVIDER_LABELS[provider] ?? 'Audio'
}

export function defaultAudioAttrs(
  parsed: ParsedAudio,
  overrides: Partial<AudioAttributes> = {},
): AudioAttributes {
  return {
    src: parsed.src,
    provider: parsed.provider,
    audioId: parsed.audioId,
    title: parsed.title,
    height: parsed.height,
    width: 100,
    align: 'center',
    caption: '',
    ...overrides,
  }
}

export function isAudioFile(provider: AudioProvider): boolean {
  return provider === 'file'
}

export function buildAudioEmbedUrl(attrs: AudioAttributes): string {
  switch (attrs.provider) {
    case 'spotify': {
      const [type, id] = attrs.audioId.split(':')
      return `https://open.spotify.com/embed/${type || 'track'}/${id || ''}`
    }
    case 'soundcloud':
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(
        attrs.src,
      )}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`
    case 'apple-podcasts': {
      try {
        const url = new URL(attrs.src)
        url.hostname = 'embed.podcasts.apple.com'
        return url.toString()
      } catch {
        return attrs.src
      }
    }
    case 'apple-music': {
      try {
        const url = new URL(attrs.src)
        url.hostname = 'embed.music.apple.com'
        return url.toString()
      } catch {
        return attrs.src
      }
    }
    case 'mixcloud':
      return `https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=${encodeURIComponent(
        attrs.src,
      )}`
    case 'deezer': {
      const [type, id] = attrs.audioId.split(':')
      return `https://widget.deezer.com/widget/dark/${type || 'track'}/${id || ''}`
    }
    case 'tidal': {
      const [type, id] = attrs.audioId.split(':')
      const plural =
        type === 'album'
          ? 'albums'
          : type === 'playlist'
            ? 'playlists'
            : 'tracks'
      return `https://embed.tidal.com/${plural}/${id || ''}`
    }
    case 'file':
      return attrs.src
    default:
      return attrs.src
  }
}
