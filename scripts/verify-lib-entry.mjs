import fs from 'node:fs'

const external = fs.readFileSync('dist-lib/external/index.js', 'utf8')
const failures = []

if (!/from\s+["']@tiptap\/core["']/.test(external)) {
  failures.push('external entry does not import @tiptap/core as a bare module')
}
if (!/from\s+["']@tiptap\/react["']/.test(external)) {
  failures.push('external entry does not import @tiptap/react as a bare module')
}
if (!/from\s+["']react["']/.test(external)) {
  failures.push('external entry does not import react as a bare module')
}
if (external.length > 600_000) {
  failures.push(`external entry is ${external.length} bytes; Tiptap may be bundled`)
}

if (failures.length > 0) {
  console.error(`External entry verification failed:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}

console.log(`External Tiptap entry verified (${Math.round(external.length / 1024)} KB).`)
