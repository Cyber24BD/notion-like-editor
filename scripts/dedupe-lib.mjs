import { createHash } from 'node:crypto'
import {
  readdir,
  readFile,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'

/**
 * The preset and external builds intentionally write to separate folders, but
 * Rollup emits many identical lazy chunks in each folder. Npm then ships the
 * same Mermaid/KaTeX/dialog code four times. Keep one canonical copy, rewrite
 * the relative imports, and remove the duplicates before packing.
 *
 * Only JavaScript chunks are touched; entry files and CSS are never removed.
 */

const ROOT = path.resolve('dist-lib')
const DRY_RUN = process.argv.includes('--dry-run')
const ENTRY_FILES = new Set([
  'index.js',
  'core.js',
  'standard.js',
  'external/index.js',
  'core-external/index.js',
  'standard-external/index.js',
])

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(full)))
    else if (entry.isFile()) files.push(full)
  }
  return files
}

function relative(file) {
  return path.relative(ROOT, file).split(path.sep).join('/')
}

function depth(file) {
  return relative(file).split('/').length
}

function isLibrarySource(file) {
  return relative(file).startsWith('lib/')
}

function isEntry(file) {
  return ENTRY_FILES.has(relative(file))
}

async function hashFile(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex')
}

function rewriteSpecifier(importer, specifier, replacements) {
  const target = path.resolve(path.dirname(importer), specifier)
  const canonical = replacements.get(target)
  if (!canonical) return specifier
  let next = path
    .relative(path.dirname(importer), canonical)
    .split(path.sep)
    .join('/')
  if (!next.startsWith('.')) next = `./${next}`
  return next
}

// Match only real module specifiers. A broad `.js` string search also hits
// Mermaid's CommonJS module map keys such as
// `"../../node_modules/pkg/lib/main.js"() { ... }`, which must stay untouched.
const IMPORT_PATTERNS = [
  /(\bfrom\s*)(['\"])(\.{1,2}\/[^'\"]+\.js)\2/g,
  /(\bimport\s*)(['\"])(\.{1,2}\/[^'\"]+\.js)\2/g,
  /(\bimport\s*\(\s*)(['\"])(\.{1,2}\/[^'\"]+\.js)\2(\s*\))/g,
]

function rewriteImports(source, importer, replacements) {
  let changed = false
  for (const pattern of IMPORT_PATTERNS) {
    source = source.replace(
      pattern,
      (match, prefix, quote, specifier, suffix = '') => {
        const next = rewriteSpecifier(importer, specifier, replacements)
        if (next === specifier) return match
        changed = true
        return `${prefix}${quote}${next}${quote}${suffix}`
      },
    )
  }
  return { source, changed }
}

function importedSpecifiers(source) {
  const specifiers = []
  for (const pattern of IMPORT_PATTERNS) {
    for (const match of source.matchAll(pattern)) specifiers.push(match[3])
  }
  return specifiers
}

const allFiles = await walk(ROOT)
const jsFiles = allFiles.filter(
  (file) => file.endsWith('.js') && !isLibrarySource(file),
)

const byHash = new Map()
for (const file of jsFiles) {
  const hash = await hashFile(file)
  const group = byHash.get(hash) ?? []
  group.push(file)
  byHash.set(hash, group)
}

const groups = [...byHash.values()].filter((group) => group.length > 1)
const replacements = new Map()
const removed = new Set()
let removedBytes = 0

for (const group of groups) {
  // Never merge an entry point with a chunk. Every entry must stay addressable
  // through package.json exports.
  if (group.some(isEntry)) continue
  group.sort((a, b) => depth(a) - depth(b) || relative(a).localeCompare(relative(b)))
  const [canonical, ...duplicates] = group
  for (const duplicate of duplicates) {
    replacements.set(duplicate, canonical)
    removed.add(duplicate)
    removedBytes += (await stat(duplicate)).size
  }
}

const specifierPattern = /(['"])(\.{1,2}\/[^'"]+\.js)\1/g
let rewrittenFiles = 0
for (const file of jsFiles) {
  if (removed.has(file)) continue
  const source = await readFile(file, 'utf8')
  const next = source.replace(
    specifierPattern,
    (match, quote, specifier) => {
      const rewritten = rewriteSpecifier(file, specifier, replacements)
      return rewritten === specifier ? match : `${quote}${rewritten}${quote}`
    },
  )
  if (next !== source) {
    rewrittenFiles += 1
    if (!DRY_RUN) await writeFile(file, next)
  }
}

const dangling = []
for (const file of jsFiles) {
  if (removed.has(file)) continue
  const source = await readFile(file, 'utf8')
  for (const specifier of importedSpecifiers(source)) {
    const target = path.resolve(path.dirname(file), specifier)
    try {
      await stat(target)
    } catch {
      dangling.push(`${relative(file)} -> ${specifier}`)
    }
  }
}

if (dangling.length) {
  console.error('Dangling imports after dedupe:')
  for (const item of dangling.slice(0, 20)) console.error('  ' + item)
  process.exit(1)
}

if (!DRY_RUN) {
  for (const file of removed) await unlink(file)
}

const remainingFiles = allFiles.filter((file) => !removed.has(file))
const finalHashes = new Map()
for (const file of remainingFiles) {
  if (!file.endsWith('.js') || isLibrarySource(file)) continue
  const hash = await hashFile(file)
  const group = finalHashes.get(hash) ?? []
  group.push(file)
  finalHashes.set(hash, group)
}
const leftovers = [...finalHashes.values()].filter(
  (group) => group.length > 1 && !group.some(isEntry),
)
if (leftovers.length) {
  console.error(
    `Duplicate library chunks remain: ${leftovers
      .slice(0, 5)
      .map((group) => group.map(relative).join(', '))
      .join(' | ')}`,
  )
  process.exit(1)
}
const totalBytes = (
  await Promise.all(
    remainingFiles.map(async (file) => (await stat(file)).size),
  )
).reduce((sum, size) => sum + size, 0)

console.log(
  `Library chunks deduplicated: ${removed.size} removed, ${rewrittenFiles} rewritten, ` +
    `${(removedBytes / 1024 / 1024).toFixed(2)} MB saved; ` +
    `${(totalBytes / 1024 / 1024).toFixed(2)} MB on disk${DRY_RUN ? ' (dry run)' : ''}.`,
)
