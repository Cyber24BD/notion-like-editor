import { readFile, readdir, writeFile } from 'node:fs/promises'

const dir = new URL('../dist-lib/lib/', import.meta.url)
for (const file of await readdir(dir)) {
  if (!file.endsWith('.d.ts')) continue
  const path = new URL(file, dir)
  const source = await readFile(path, 'utf8')
  await writeFile(path, source.replace(/^import ['"][^'"]+\.css['"];\n/gm, ''))
}
