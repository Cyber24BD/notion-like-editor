import { useRef, useState } from 'react'
import { NotionEditor, type NotionEditorHandle } from '../components/PageEditor'
import type { ImageUploadContext } from '../editor/images/imageFiles'
import type { Editor, JSONContent } from '@tiptap/core'

const INITIAL: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Harness document' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Controlled editor body.' }],
    },
  ],
}

const EXTERNAL: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Loaded externally' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'No remount happened.' }],
    },
  ],
}

const REF_DOC: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Set by ref' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Imperative update.' }],
    },
  ],
}

interface UploadRecord {
  name: string
  type: string
  size: number
  originalType: string
  originalSize: number
  width: number
  height: number
  failed: boolean
}

interface HarnessDebug {
  uploads: UploadRecord[]
  events: Array<{
    phase: 'start' | 'end'
    name: string
    active: number
    t: number
  }>
  active: number
  maxActive: number
}

interface HarnessState {
  json: JSONContent | null
  empty: boolean
}

interface HarnessWindow extends Window {
  __harness?: HarnessDebug
  __harnessState?: HarnessState
}

function debug(): HarnessDebug {
  const host = window as unknown as HarnessWindow
  return (host.__harness ??= {
    uploads: [],
    events: [],
    active: 0,
    maxActive: 0,
  })
}

function readDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsDataURL(file)
  })
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms)
    const abort = () => {
      window.clearTimeout(timer)
      reject(new DOMException('Upload cancelled', 'AbortError'))
    }
    if (signal?.aborted) abort()
    else signal?.addEventListener('abort', abort, { once: true })
  })
}

export function Harness() {
  const [title, setTitle] = useState('Harness document')
  const [content, setContent] = useState<JSONContent | null>(INITIAL)
  const [edits, setEdits] = useState(0)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useAdapter, setUseAdapter] = useState(true)
  const editorRef = useRef<NotionEditorHandle>(null)
  const failNext = useRef(false)

  const uploadImage = async (file: File, context: ImageUploadContext) => {
    setError(null)
    const fail = failNext.current
    failNext.current = false
    const stats = debug()
    const active = stats.active + 1
    stats.active = active
    stats.maxActive = Math.max(stats.maxActive, active)
    stats.events.push({
      phase: 'start',
      name: file.name,
      active,
      t: Math.round(performance.now()),
    })
    try {
      stats.uploads.push({
        name: file.name,
        type: file.type,
        size: file.size,
        originalType: context.originalFile.type,
        originalSize: context.originalFile.size,
        width: context.width,
        height: context.height,
        failed: fail,
      })
      context.onProgress?.(10)
      await delay(800, context.signal)
      context.onProgress?.(55)
      await delay(800, context.signal)
      if (fail) throw new Error('Simulated upload failure')
      const src = await readDataURL(file)
      return {
        src,
        width: context.width,
        height: context.height,
        alt: context.alt,
      }
    } finally {
      stats.active = Math.max(0, stats.active - 1)
      stats.events.push({
        phase: 'end',
        name: file.name,
        active: stats.active,
        t: Math.round(performance.now()),
      })
    }
  }

  const capture = () => {
    const host = window as unknown as HarnessWindow
    host.__harnessState = {
      json: editorRef.current?.getJSON() ?? null,
      empty: editorRef.current?.isEmpty() ?? true,
    }
  }

  const onReady = (_editor: Editor) => {
    setReady(true)
  }

  return (
    <div className="harness">
      <header className="harness__bar">
        <strong>notion-like-editor harness</strong>
        <button type="button" onClick={() => setContent(EXTERNAL)}>
          External update
        </button>
        <button
          type="button"
          onClick={() => editorRef.current?.setContent(REF_DOC)}
        >
          Ref set
        </button>
        <button type="button" onClick={capture}>
          Capture state
        </button>
        <button
          type="button"
          onClick={() => {
            failNext.current = true
          }}
        >
          Fail next upload
        </button>
        <button type="button" onClick={() => setUseAdapter((value) => !value)}>
          {useAdapter ? 'Use local storage' : 'Use upload adapter'}
        </button>
      </header>
      <div className="harness__editor">
        <NotionEditor
          ref={editorRef}
          documentId="harness"
          title={title}
          icon="🧪"
          value={content}
          onTitleChange={setTitle}
          onContentChange={(next) => {
            setContent(next)
            setEdits((value) => value + 1)
          }}
          uploadImage={useAdapter ? uploadImage : undefined}
          onImageUploadError={(err) => {
            setError(err instanceof Error ? err.message : 'upload failed')
          }}
          onReady={onReady}
          onCreateSubPage={() => null}
        />
      </div>
      <footer className="harness__status" data-testid="harness-status">
        Edits: {edits} · Blocks:{' '}
        {Array.isArray(content?.content) ? content.content.length : 0} · Ready:{' '}
        {ready ? 'yes' : 'no'} · Mode: {useAdapter ? 'adapter' : 'local'}
        {error ? ` · Error: ${error}` : ''}
      </footer>
    </div>
  )
}
