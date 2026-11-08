import type { EditorView } from '@tiptap/pm/view'
import { Fragment, type Node as PMNode } from '@tiptap/pm/model'
import { TextSelection } from '@tiptap/pm/state'
import {
  imageAltFromFile,
  prepareImageFile,
  readPreparedImage,
  type ImageServices,
  type PreparedImage,
  type UploadedImage,
} from './imageFiles'

export const SKIP_CONTENT_META = 'notion:skip-content-change'

const MAX_CONCURRENT_UPLOADS = 3
const UPLOAD_TIMEOUT_MS = 60_000

const CLEAR_UPLOAD = {
  uploadId: null,
  uploadState: null,
  uploadProgress: 0,
  uploadError: null,
  uploadPreview: null,
} as const

interface UploadTask {
  id: string
  view: EditorView
  file: File
  originalFile: File
  previewUrl: string
  alt: string
  mode: 'insert' | 'replace'
  uploader?: NonNullable<ImageServices['uploader']>
  onUploadError?: ImageServices['onUploadError']
  controller: AbortController | null
  prepared?: PreparedImage
  cancelled: boolean
  running: boolean
}

const tasksByView = new WeakMap<EditorView, Map<string, UploadTask>>()
const activeByView = new WeakMap<EditorView, Set<string>>()

function tasksFor(view: EditorView): Map<string, UploadTask> {
  let tasks = tasksByView.get(view)
  if (!tasks) {
    tasks = new Map()
    tasksByView.set(view, tasks)
  }
  return tasks
}

function activeFor(view: EditorView): Set<string> {
  let active = activeByView.get(view)
  if (!active) {
    active = new Set()
    activeByView.set(view, active)
  }
  return active
}

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function findUploadPos(view: EditorView, id: string): number | null {
  let found: number | null = null
  view.state.doc.descendants((node, pos) => {
    if (found !== null) return false
    if (node.type.name === 'image' && node.attrs.uploadId === id) {
      found = pos
      return false
    }
    return true
  })
  return found
}

function updateUploadNode(
  view: EditorView,
  id: string,
  patch: Record<string, unknown>,
  silent: boolean,
): boolean {
  const pos = findUploadPos(view, id)
  if (pos === null) return false
  const node = view.state.doc.nodeAt(pos)
  if (!node || node.type.name !== 'image') return false
  const tr = view.state.tr.setNodeMarkup(pos, undefined, {
    ...node.attrs,
    ...patch,
  })
  if (silent) tr.setMeta(SKIP_CONTENT_META, true)
  tr.setMeta('addToHistory', false)
  view.dispatch(tr)
  return true
}

function cleanupTask(task: UploadTask): void {
  URL.revokeObjectURL(task.previewUrl)
  tasksFor(task.view).delete(task.id)
}

function insertNodes(
  view: EditorView,
  nodes: PMNode[],
  pos: number,
  silent: boolean,
): boolean {
  if (view.isDestroyed || nodes.length === 0) return false
  const { state } = view
  const safePos = Math.max(0, Math.min(pos, state.doc.content.size))
  const $pos = state.doc.resolve(safePos)
  const depth = Math.min($pos.depth, 1)
  const isInsideEmptyBlock =
    depth > 0 && $pos.parent.isTextblock && $pos.parent.content.size === 0

  const tr = isInsideEmptyBlock
    ? state.tr.replaceWith(
        $pos.before(depth),
        $pos.before(depth) + $pos.parent.nodeSize,
        Fragment.fromArray(nodes),
      )
    : state.tr.insert(depth > 0 ? $pos.after(depth) : 0, Fragment.fromArray(nodes))

  const insertedSize = nodes.reduce((total, node) => total + node.nodeSize, 0)
  const selectionPos = Math.min(
    (isInsideEmptyBlock ? $pos.before(depth) : $pos.after(depth)) + insertedSize,
    tr.doc.content.size,
  )
  tr.setSelection(TextSelection.near(tr.doc.resolve(selectionPos)))
  if (silent) tr.setMeta(SKIP_CONTENT_META, true)
  if (silent) tr.setMeta('addToHistory', false)
  view.dispatch(tr.scrollIntoView())
  return true
}

function pumpQueue(view: EditorView): void {
  if (view.isDestroyed) return
  const active = activeFor(view)
  const tasks = tasksFor(view)

  for (const task of [...tasks.values()]) {
    if (active.size >= MAX_CONCURRENT_UPLOADS) break
    if (task.cancelled || task.running) continue

    const pos = findUploadPos(view, task.id)
    if (pos === null) {
      cleanupTask(task)
      continue
    }
    const node = view.state.doc.nodeAt(pos)
    if (!node || node.attrs.uploadState !== 'queued') continue

    active.add(task.id)
    void runUpload(task)
  }
}

/**
 * Inserts images at/after the position. Every path gets an optimistic
 * placeholder; local processing and remote uploads share the same queue.
 */
export async function insertImageFiles(
  view: EditorView,
  files: File[],
  pos: number,
  services?: ImageServices | null,
): Promise<void> {
  const imageType = view.state.schema.nodes.image
  if (!imageType) return

  const nodes: PMNode[] = []
  const tasks: UploadTask[] = []
  for (const file of files) {
    const id = uid()
    const previewUrl = URL.createObjectURL(file)
    const alt = imageAltFromFile(file)
    nodes.push(
      imageType.create({
        src: '',
        alt,
        title: alt,
        uploadId: id,
        uploadState: 'queued',
        uploadProgress: 0,
        uploadError: null,
        uploadPreview: previewUrl,
      }),
    )
    tasks.push({
      id,
      view,
      file,
      originalFile: file,
      previewUrl,
      alt,
      mode: 'insert',
      uploader: services?.uploader,
      onUploadError: services?.onUploadError,
      controller: null,
      cancelled: false,
      running: false,
    })
  }

  if (!insertNodes(view, nodes, pos, true)) {
    for (const task of tasks) cleanupTask(task)
    return
  }

  for (const task of tasks) tasksFor(view).set(task.id, task)
  pumpQueue(view)
}

/** Replaces an existing image with optimistic preparation/upload UI. */
export function startImageReplacement(
  view: EditorView,
  pos: number,
  file: File,
  services?: ImageServices | null,
): void {
  if (view.isDestroyed) return
  const node = view.state.doc.nodeAt(pos)
  if (!node || node.type.name !== 'image') return

  const id = uid()
  const previewUrl = URL.createObjectURL(file)
  const alt = imageAltFromFile(file)
  const task: UploadTask = {
    id,
    view,
    file,
    originalFile: file,
    previewUrl,
    alt,
    mode: 'replace',
    uploader: services?.uploader,
    onUploadError: services?.onUploadError,
    controller: null,
    cancelled: false,
    running: false,
  }

  const tr = view.state.tr
    .setNodeMarkup(pos, undefined, {
      ...node.attrs,
      uploadId: id,
      uploadState: 'queued',
      uploadProgress: 0,
      uploadError: null,
      uploadPreview: previewUrl,
    })
    .setMeta(SKIP_CONTENT_META, true)
    .setMeta('addToHistory', false)
  view.dispatch(tr)

  tasksFor(view).set(id, task)
  pumpQueue(view)
}

export function cancelImageUpload(view: EditorView, id: string): void {
  const tasks = tasksFor(view)
  const task = tasks.get(id)
  if (!task) return

  task.cancelled = true
  task.controller?.abort()
  tasks.delete(id)
  // Release the queue slot immediately. A host uploader that ignores the abort
  // signal must not be able to stall every later upload.
  activeFor(view).delete(id)

  const pos = findUploadPos(view, id)
  if (pos !== null) {
    const node = view.state.doc.nodeAt(pos)
    if (node && node.type.name === 'image') {
      if (task.mode === 'insert') {
        const tr = view.state.tr.delete(pos, pos + node.nodeSize)
        tr.setSelection(
          TextSelection.near(
            tr.doc.resolve(Math.min(pos, tr.doc.content.size)),
          ),
        )
        tr.setMeta(SKIP_CONTENT_META, true)
        tr.setMeta('addToHistory', false)
        view.dispatch(tr)
      } else {
        const tr = view.state.tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          ...CLEAR_UPLOAD,
        })
        tr.setMeta(SKIP_CONTENT_META, true)
        tr.setMeta('addToHistory', false)
        view.dispatch(tr)
      }
    }
  }

  URL.revokeObjectURL(task.previewUrl)
  pumpQueue(view)
}

export function retryImageUpload(view: EditorView, id: string): void {
  const task = tasksFor(view).get(id)
  if (!task || task.running) return
  if (findUploadPos(view, id) === null) {
    cleanupTask(task)
    return
  }
  task.cancelled = false
  task.controller = null
  updateUploadNode(
    view,
    id,
    { uploadState: 'queued', uploadProgress: 0, uploadError: null },
    true,
  )
  pumpQueue(view)
}

async function runUpload(task: UploadTask): Promise<void> {
  const { view } = task
  if (task.cancelled || view.isDestroyed) {
    activeFor(view).delete(task.id)
    pumpQueue(view)
    return
  }
  task.running = true

  try {
    updateUploadNode(
      view,
      task.id,
      { uploadState: 'preparing', uploadProgress: 0, uploadError: null },
      true,
    )

    const prepared = task.prepared ?? (await prepareImageFile(task.file))
    if (task.cancelled || view.isDestroyed) return
    if (!prepared) throw new Error('That image could not be prepared.')
    task.prepared = prepared
    task.alt = prepared.alt

    if (!task.uploader) {
      // Local fallback: same optimistic shell, no network step.
      const src = await readPreparedImage(prepared)
      if (task.cancelled || view.isDestroyed) return
      commitFinalImage(view, task, src, prepared.alt)
      return
    }

    if (!updateUploadNode(view, task.id, { uploadState: 'uploading' }, true)) {
      cleanupTask(task)
      return
    }

    const controller = new AbortController()
    task.controller = controller
    let lastProgress = -1
    let timeoutId = 0

    const timeout = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => {
        controller.abort()
        reject(new Error('Image upload timed out. Please try again.'))
      }, UPLOAD_TIMEOUT_MS)
    })

    let uploaded
    try {
      uploaded = await Promise.race([
        task.uploader(prepared.file, {
          originalFile: task.originalFile,
          width: prepared.width,
          height: prepared.height,
          alt: prepared.alt,
          signal: controller.signal,
          onProgress: (value) => {
            if (task.cancelled) return
            const progress = Math.max(
              0,
              Math.min(100, Math.round(Number(value) || 0)),
            )
            if (progress === lastProgress) return
            lastProgress = progress
            updateUploadNode(
              view,
              task.id,
              { uploadState: 'uploading', uploadProgress: progress },
              true,
            )
          },
        }),
        timeout,
      ])
    } finally {
      window.clearTimeout(timeoutId)
    }

    if (task.cancelled || view.isDestroyed) return
    if (uploaded == null) {
      cancelImageUpload(view, task.id)
      return
    }

    const result: UploadedImage =
      typeof uploaded === 'string' ? { src: uploaded } : uploaded
    if (!result.src) throw new Error('The image upload did not return a URL.')
    commitFinalImage(view, task, result.src, result.alt ?? prepared.alt)
  } catch (error) {
    if (task.cancelled) return
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Image upload failed. Please try again.'
    const alive = updateUploadNode(
      view,
      task.id,
      { uploadState: 'error', uploadProgress: 0, uploadError: message },
      true,
    )
    if (alive) {
      task.onUploadError?.(error, task.originalFile)
    } else {
      cleanupTask(task)
    }
  } finally {
    task.running = false
    activeFor(view).delete(task.id)
    pumpQueue(view)
  }
}

function commitFinalImage(
  view: EditorView,
  task: UploadTask,
  src: string,
  alt: string,
): void {
  const pos = findUploadPos(view, task.id)
  if (pos === null) {
    cleanupTask(task)
    return
  }
  const node = view.state.doc.nodeAt(pos)
  if (!node || node.type.name !== 'image') {
    cleanupTask(task)
    return
  }

  if (task.mode === 'insert') {
    const finalNode = node.type.create({
      ...node.attrs,
      src,
      alt,
      title: alt,
      ...CLEAR_UPLOAD,
    })
    // Remove the transient placeholder without polluting history, then add the
    // real image as one undoable insertion.
    const remove = view.state.tr
      .delete(pos, pos + node.nodeSize)
      .setMeta(SKIP_CONTENT_META, true)
      .setMeta('addToHistory', false)
    view.dispatch(remove)
    const insertPos = Math.min(pos, view.state.doc.content.size)
    const insert = view.state.tr.insert(insertPos, finalNode)
    insert.setSelection(
      TextSelection.near(
        insert.doc.resolve(
          Math.min(insertPos + finalNode.nodeSize, insert.doc.content.size),
        ),
      ),
    )
    view.dispatch(insert.scrollIntoView())
  } else {
    // Put the old image back briefly (non-history), then replace it in one
    // undoable step. Undo restores the previous image, redo shows the new one.
    const oldAttrs = { ...node.attrs, ...CLEAR_UPLOAD }
    const clear = view.state.tr
      .setNodeMarkup(pos, undefined, oldAttrs)
      .setMeta(SKIP_CONTENT_META, true)
      .setMeta('addToHistory', false)
    view.dispatch(clear)
    const finalAttrs = {
      ...oldAttrs,
      src,
      alt,
      title: alt,
    }
    view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, finalAttrs))
  }

  cleanupTask(task)
}

export function cleanupImageUploads(view: EditorView): void {
  const tasks = tasksFor(view)
  for (const task of tasks.values()) {
    task.cancelled = true
    task.controller?.abort()
    URL.revokeObjectURL(task.previewUrl)
  }
  tasks.clear()
  activeFor(view).clear()
}
