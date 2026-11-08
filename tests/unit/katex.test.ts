import katex from 'katex'
import { describe, expect, it } from 'vitest'

describe('KaTeX rendering', () => {
  it('renders a basic expression', () => {
    expect(katex.renderToString('x^2')).toContain('katex')
  })

  it('does not emit javascript links when trust is disabled', () => {
    const html = katex.renderToString(
      String.raw`\href{javascript:alert(1)}{click}`,
      { trust: false, throwOnError: false },
    )
    expect(html.toLowerCase()).not.toContain('href="javascript:')
  })
})
