import { readFile, writeFile } from 'node:fs/promises'

const file = new URL('../dist-lib/lib/index.d.ts', import.meta.url)
const source = await readFile(file, 'utf8')
await writeFile(file, source.replace("import './notion-editor.css';\n", ''))
