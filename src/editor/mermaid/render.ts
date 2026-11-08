import type { MermaidConfig } from 'mermaid'

let mermaidPromise: Promise<typeof import('mermaid')['default']> | null = null
let zenumlPromise: Promise<boolean> | null = null
let zenumlRegistered = false
let initializedTheme: string | null = null
let counter = 0
let renderChain: Promise<unknown> = Promise.resolve()

function needsZenuml(code: string): boolean {
  return /^\s*zenuml\b/im.test(code)
}

async function ensureZenuml(
  mermaid: typeof import('mermaid')['default'],
): Promise<boolean> {
  if (zenumlRegistered) return true
  if (!zenumlPromise) {
    zenumlPromise = (async () => {
      try {
        const zenuml = (await import('@mermaid-js/mermaid-zenuml')).default
        await mermaid.registerExternalDiagrams([zenuml])
        zenumlRegistered = true
        return true
      } catch {
        return false
      }
    })()
  }
  return zenumlPromise
}

async function getMermaid(theme: string, withZenuml: boolean) {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((module) => module.default)
  }
  const mermaid = await mermaidPromise

  // ZenUML is an external diagram in Mermaid 11. Load its separate plugin chunk
  // only when the user actually writes a ZenUML diagram.
  if (withZenuml) {
    const wasRegistered = zenumlRegistered
    const registered = await ensureZenuml(mermaid)
    if (registered && !wasRegistered) initializedTheme = null
  }

  if (initializedTheme !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      theme: theme as MermaidConfig['theme'],
      fontFamily: 'Inter, system-ui, sans-serif',
    })
    initializedTheme = theme
  }
  return mermaid
}

function cleanupArtifacts(id: string): void {
  for (const element of [
    document.getElementById(`dmermaid-${id}`),
    document.getElementById(`mermaid-${id}`),
  ]) {
    element?.remove()
  }
  // Defensive cleanup for a previous interrupted render. Mermaid stores its
  // temporary/error diagrams in body-level elements with this id prefix.
  document
    .querySelectorAll('[id^="dmermaid-"]')
    .forEach((element) => element.remove())
}

async function renderNow(code: string, theme: string): Promise<string> {
  const mermaid = await getMermaid(theme, needsZenuml(code))
  const id = `mermaid-${Date.now()}-${counter++}`
  try {
    // Parse first. Without this, mermaid.render() can resolve with a red
    // "Syntax error in text (mermaid version …)" SVG and leave it in the body.
    await mermaid.parse(code)
    const { svg } = await mermaid.render(id, code)
    if (
      /Syntax error in text|aria-roledescription="error"/i.test(svg)
    ) {
      throw new Error('Mermaid could not parse this diagram.')
    }
    return svg
  } finally {
    cleanupArtifacts(id)
  }
}

/**
 * Mermaid keeps module-level theme/parser state. Serialize renders so fast
 * typing in the dialog cannot interleave two initialize/render cycles.
 */
export async function renderMermaid(
  code: string,
  theme: string,
): Promise<string> {
  const task = renderChain.then(() => renderNow(code, theme))
  renderChain = task.catch(() => undefined)
  return task
}

export function formatMermaidError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Could not render this diagram.'
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const first = lines[0] ?? raw
  if (first.startsWith('Parsing failed:')) {
    return first.replace(/^Parsing failed:\s*/, '')
  }
  const detail = lines[1] && !lines[1].startsWith('-') ? lines[1] : ''
  return detail ? `${first} ${detail}` : first
}

export function mermaidLiveUrl(code: string, theme: string): string {
  const state = {
    code,
    mermaid: { theme },
    autoSync: true,
    updateDiagram: true,
  }
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(state))))
  return `https://mermaid.live/edit#base64:${encoded}`
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function downloadSvg(svg: string, filename = 'diagram.svg'): void {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
