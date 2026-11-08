import fs from 'node:fs'

const css = fs.readFileSync('dist-lib/notion-editor.css', 'utf8')
const failures = []

const checks = [
  ['.notion-editor-root .btn', /\.notion-editor-root\s+\.btn\b/],
  ['.notion-editor-root .menu', /\.notion-editor-root\s+\.menu\b/],
  ['.notion-editor-root .popover', /\.notion-editor-root\s+\.popover\b/],
  ['dark scoped selector', /\[data-theme=dark\]\s+\.notion-editor-root\b/],
]

for (const [label, pattern] of checks) {
  if (!pattern.test(css)) failures.push(`missing ${label}`)
}
if (/(^|})\s*body\s*\{/.test(css)) failures.push('library CSS still styles body')
if (/:root\s*\{/.test(css)) failures.push('library CSS still styles :root globally')
if (css.includes('KaTeX_Main')) failures.push('KaTeX fonts are back in the base stylesheet')
if (css.length > 300_000) failures.push(`stylesheet is ${css.length} bytes`)

if (failures.length > 0) {
  console.error(`Library CSS verification failed:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}

console.log(`Library CSS verified (${Math.round(css.length / 1024)} KB, scoped).`)
