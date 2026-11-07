export type IframeAlign = 'left' | 'center' | 'right'

export interface IframeAttributes {
  src: string
  title: string
  width: number
  height: number
  align: IframeAlign
  caption: string
  allowFullScreen: boolean
}

export interface ParsedIframe {
  src: string
  title: string
  width: number | null
  height: number | null
  allowFullScreen: boolean
}

const MIN_WIDTH = 15
const MAX_WIDTH = 100
const MIN_HEIGHT = 120
const MAX_HEIGHT = 2000
const DEFAULT_HEIGHT = 420

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function toNumber(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Number.parseFloat(value.replace(/px$/i, '').trim())
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Only http(s) URLs are allowed. This blocks `javascript:`, `data:` and other
 * schemes that could execute code inside the editor.
 */
export function isSafeIframeSrc(raw: string): boolean {
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

export function normalizeIframeSrc(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  const normalized = value.startsWith('//')
    ? `https:${value}`
    : /^https?:\/\//i.test(value)
      ? value
      : `https://${value}`
  if (!isSafeIframeSrc(normalized)) return null
  try {
    return new URL(normalized).toString()
  } catch {
    return null
  }
}

function hostLabel(src: string): string {
  try {
    return new URL(src).hostname.replace(/^www\./, '')
  } catch {
    return 'Embedded content'
  }
}

/**
 * Accepts either a plain URL or a full `<iframe …>` embed snippet and returns
 * the attributes needed to create an iframe block.
 */
export function parseIframeInput(raw: string): ParsedIframe | null {
  const value = raw.trim()
  if (!value) return null

  if (/<iframe/i.test(value)) {
    const document = new DOMParser().parseFromString(value, 'text/html')
    const element = document.querySelector('iframe[src]')
    const src = element?.getAttribute('src') ?? ''
    const normalized = normalizeIframeSrc(src)
    if (!normalized) return null
    return {
      src: normalized,
      title: element?.getAttribute('title')?.trim() || hostLabel(normalized),
      width: toNumber(element?.getAttribute('width')),
      height: toNumber(element?.getAttribute('height')),
      allowFullScreen:
        element?.hasAttribute('allowfullscreen') ||
        element?.getAttribute('allowfullscreen') === 'true',
    }
  }

  const normalized = normalizeIframeSrc(value)
  if (!normalized) return null
  return {
    src: normalized,
    title: hostLabel(normalized),
    width: null,
    height: null,
    allowFullScreen: true,
  }
}

export function defaultIframeAttrs(
  parsed: ParsedIframe,
  overrides: Partial<IframeAttributes> = {},
): IframeAttributes {
  return {
    src: parsed.src,
    title: parsed.title,
    width: clamp(parsed.width ?? 100, MIN_WIDTH, MAX_WIDTH),
    height: clamp(parsed.height ?? DEFAULT_HEIGHT, MIN_HEIGHT, MAX_HEIGHT),
    align: 'center',
    caption: '',
    allowFullScreen: parsed.allowFullScreen,
    ...overrides,
  }
}

export function iframeHostLabel(src: string): string {
  return hostLabel(src)
}

export function clampIframeWidth(value: number): number {
  return clamp(Math.round(value), MIN_WIDTH, MAX_WIDTH)
}

export function clampIframeHeight(value: number): number {
  return clamp(Math.round(value), MIN_HEIGHT, MAX_HEIGHT)
}

export const IFRAME_MIN_HEIGHT = MIN_HEIGHT
export const IFRAME_MAX_HEIGHT = MAX_HEIGHT
export const IFRAME_DEFAULT_HEIGHT = DEFAULT_HEIGHT
