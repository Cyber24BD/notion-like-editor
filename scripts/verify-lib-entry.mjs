import fs from 'node:fs'

const entries = [
  ['dist-lib/external/index.js', 600_000],
  ['dist-lib/core-external/index.js', 300_000],
  ['dist-lib/standard-external/index.js', 500_000],
]

const failures = []
for (const [file, maxSize] of entries) {
  if (!fs.existsSync(file)) {
    failures.push(`missing ${file}`)
    continue
  }
  const source = fs.readFileSync(file, 'utf8')
  if (!/from\s+["']@tiptap\/core["']/.test(source)) {
    failures.push(`${file} does not keep @tiptap/core external`)
  }
  if (!/from\s+["']@tiptap\/react["']/.test(source)) {
    failures.push(`${file} does not keep @tiptap/react external`)
  }
  if (!/from\s+["']react["']/.test(source)) {
    failures.push(`${file} does not keep react external`)
  }
  if (source.length > maxSize) {
    failures.push(`${file} is ${source.length} bytes; Tiptap may be bundled`)
  }
}

if (failures.length > 0) {
  console.error(`External entry verification failed:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}

console.log('External Tiptap entries verified (full, core, standard).')
