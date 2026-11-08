import path from 'node:path'

export default function presetExtensions(entry) {
  const target = path.resolve(process.cwd(), entry)
  return {
    name: 'notion-preset-extensions',
    enforce: 'pre',
    resolveId(source, importer) {
      const normalized = importer ? importer.replace(/\\/g, '/') : ''
      if (
        source === '../editor/createExtensions' &&
        normalized.endsWith('/src/components/PageEditor.tsx')
      ) {
        return target
      }
      return null
    },
  }
}
