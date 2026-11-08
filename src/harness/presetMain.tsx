import { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { JSONContent } from '@tiptap/core'
import type { NotionEditorHandle } from '../components/PageEditor'
import './harness.css'

type PresetModule = typeof import('../lib/core')

const INITIAL: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Preset document' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Preset editor body.' }],
    },
  ],
}

function PresetHarness({
  Editor,
  preset,
}: {
  Editor: PresetModule['NotionEditor']
  preset: string
}) {
  const [title, setTitle] = useState('Preset harness')
  const ref = useRef<NotionEditorHandle>(null)

  return (
    <div className="preset-harness" data-preset={preset}>
      <Editor
        ref={ref}
        documentId={`preset-${preset}`}
        title={title}
        content={INITIAL}
        onTitleChange={setTitle}
      />
    </div>
  )
}

async function loadPreset(preset: string): Promise<{
  Editor: PresetModule['NotionEditor']
  preset: string
}> {
  switch (preset) {
    case 'core':
      await import('../lib/styles/core.css')
      return { Editor: (await import('../lib/core')).NotionEditor, preset }
    case 'standard':
      await import('../lib/styles/standard.css')
      return { Editor: (await import('../lib/standard')).NotionEditor, preset }
    case 'core-external':
      await import('../lib/styles/core.css')
      return {
        Editor: (await import('../lib/coreExternal')).NotionEditor,
        preset,
      }
    case 'standard-external':
      await import('../lib/styles/standard.css')
      return {
        Editor: (await import('../lib/standardExternal')).NotionEditor,
        preset,
      }
    default:
      throw new Error(`Unknown preset: ${preset}`)
  }
}

const rootElement = document.getElementById('root')!
const root = createRoot(rootElement)
const preset = new URLSearchParams(window.location.search).get('preset') ?? 'core'

loadPreset(preset)
  .then(({ Editor, preset: resolvedPreset }) => {
    root.render(<PresetHarness Editor={Editor} preset={resolvedPreset} />)
  })
  .catch((error: unknown) => {
    rootElement.innerHTML = `<pre class="preset-harness__error">${
      error instanceof Error ? error.message : String(error)
    }</pre>`
  })
