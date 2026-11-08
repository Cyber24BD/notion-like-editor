import fs from 'node:fs'

const stylesheets = [
  ['notion-editor.css', 300_000],
  ['core.css', 150_000],
  ['standard.css', 200_000],
]

const failures = []
for (const [file, maxSize] of stylesheets) {
  const path = `dist-lib/${file}`
  if (!fs.existsSync(path)) {
    failures.push(`missing ${file}`)
    continue
  }
  const css = fs.readFileSync(path, 'utf8')
  if (!css.includes('.notion-editor-root .notion-btn')) {
    failures.push(`${file} is not scoped`)
  }
  if (/(^|})\s*body\s*\{/.test(css)) failures.push(`${file} still styles body`)
  if (/:root\s*\{/.test(css)) failures.push(`${file} still styles :root globally`)
  if (css.includes('KaTeX_Main')) failures.push(`${file} contains KaTeX fonts`)
  if (css.length > maxSize) failures.push(`${file} is ${css.length} bytes`)
}

if (failures.length > 0) {
  console.error(`Library CSS verification failed:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}

console.log('Library stylesheets verified (full, core, standard; scoped).')
