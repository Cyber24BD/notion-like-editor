import type { MermaidConfig } from 'mermaid'

let mermaidPromise: Promise<typeof import('mermaid')['default']> | null = null
let initializedTheme: string | null = null
let counter = 0

async function getMermaid(theme: string) {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((module) => module.default)
  }
  const mermaid = await mermaidPromise
  if (initializedTheme !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: theme as MermaidConfig['theme'],
      fontFamily: 'Inter, system-ui, sans-serif',
    })
    initializedTheme = theme
  }
  return mermaid
}

export async function renderMermaid(
  code: string,
  theme: string,
): Promise<string> {
  const mermaid = await getMermaid(theme)
  const id = `mermaid-${Date.now()}-${counter++}`
  const { svg } = await mermaid.render(id, code)
  return svg
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
