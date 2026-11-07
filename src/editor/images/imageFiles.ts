import type { EditorView } from '@tiptap/pm/view'
import { TextSelection } from '@tiptap/pm/state'
import { Fragment, type Node as PMNode } from '@tiptap/pm/model'

export interface PickedImage {
  src: string
  alt: string
  width: number
  height: number
}

const MAX_DIMENSION = 1600
const MAX_DATA_URL_LENGTH = 1_400_000
const PASSTHROUGH_BYTES = 480_000

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read that file.'))
    reader.readAsDataURL(file)
  })
}

function baseName(file: File): string {
  return file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Image'
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('That image could not be decoded.'))
    image.src = url
  })
}

function encode(
  image: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
  sourceType: string,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available in this browser.')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, width, height)

  const webp = canvas.toDataURL('image/webp', quality)
  if (webp.startsWith('data:image/webp')) return webp
  return sourceType === 'image/png'
    ? canvas.toDataURL('image/png')
    : canvas.toDataURL('image/jpeg', quality)
}

/**
 * Reads a local image, downsizes/compresses it for localStorage and returns a
 * data URL ready for the editor. Animated GIFs and SVGs are passed through.
 */
export async function processImageFile(file: File): Promise<PickedImage | null> {
  if (!file.type.startsWith('image/')) return null
  const alt = baseName(file)
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await loadImage(objectUrl)
    const naturalWidth = image.naturalWidth || 1
    const naturalHeight = image.naturalHeight || 1
    const passThrough =
      file.type === 'image/gif' ||
      file.type === 'image/svg+xml' ||
      (Math.max(naturalWidth, naturalHeight) <= MAX_DIMENSION &&
        file.size <= PASSTHROUGH_BYTES)

    const raw = await readAsDataURL(file)

    if (passThrough) {
      if (raw.length > MAX_DATA_URL_LENGTH * 1.6) {
        window.alert(
          'That image is quite large. Try a smaller file so the page keeps saving locally.',
        )
        return null
      }
      return { src: raw, alt, width: naturalWidth, height: naturalHeight }
    }

    const attempts = [
      { dimension: MAX_DIMENSION, quality: 0.86 },
      { dimension: 1280, quality: 0.8 },
      { dimension: 1024, quality: 0.74 },
      { dimension: 860, quality: 0.7 },
    ]

    let src = ''
    for (const attempt of attempts) {
      const scale = Math.min(1, attempt.dimension / Math.max(naturalWidth, naturalHeight))
      const width = Math.max(1, Math.round(naturalWidth * scale))
      const height = Math.max(1, Math.round(naturalHeight * scale))
      src = encode(image, width, height, attempt.quality, file.type)
      if (src.length <= MAX_DATA_URL_LENGTH) {
        return { src, alt, width, height }
      }
    }

    if (src.length > MAX_DATA_URL_LENGTH * 1.8) {
      window.alert(
        'That image is too large to keep locally. Try a smaller image or a screenshot.',
      )
      return null
    }
    return { src, alt, width: naturalWidth, height: naturalHeight }
  } catch {
    window.alert('That file could not be used as an image.')
    return null
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export interface CropFraction {
  x: number
  y: number
  width: number
  height: number
}

/** Crops a (data-URL) image and re-runs the compression pipeline. */
export async function cropImageSource(
  src: string,
  crop: CropFraction,
): Promise<string | null> {
  try {
    const image = await loadImage(src)
    const naturalWidth = image.naturalWidth || 1
    const naturalHeight = image.naturalHeight || 1
    const sx = Math.round(crop.x * naturalWidth)
    const sy = Math.round(crop.y * naturalHeight)
    const sw = Math.max(1, Math.round(crop.width * naturalWidth))
    const sh = Math.max(1, Math.round(crop.height * naturalHeight))

    const canvas = document.createElement('canvas')
    canvas.width = sw
    canvas.height = sh
    const context = canvas.getContext('2d')
    if (!context) return null
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png')
    })
    if (!blob) return null

    const file = new File([blob], 'cropped.png', { type: 'image/png' })
    const processed = await processImageFile(file)
    return processed?.src ?? null
  } catch {
    return null
  }
}

/**
 * Opens the operating system's file picker. Must be called from a user gesture
 * (click / Enter) so the browser allows the dialog.
 */
export function pickImageFile(): Promise<PickedImage | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.style.position = 'fixed'
    input.style.left = '-9999px'
    input.setAttribute('aria-hidden', 'true')
    document.body.appendChild(input)

    let settled = false
    const handleFocus = () => {
      // The dialog closed. Give the change event a moment to arrive.
      window.setTimeout(() => {
        if (!input.files || input.files.length === 0) finish(null)
      }, 450)
    }

    const finish = (value: PickedImage | null) => {
      if (settled) return
      settled = true
      window.removeEventListener('focus', handleFocus)
      window.setTimeout(() => input.remove(), 0)
      resolve(value)
    }

    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) {
        finish(null)
        return
      }
      void processImageFile(file).then(finish).catch(() => finish(null))
    })

    input.addEventListener('cancel', () => finish(null))
    window.addEventListener('focus', handleFocus, { once: true })
    input.click()
  })
}

/** Files from a drop or clipboard transfer, including pasted screenshots. */
export function imageFilesFromTransfer(transfer: DataTransfer | null): File[] {
  if (!transfer) return []
  const files = Array.from(transfer.files).filter((file) =>
    file.type.startsWith('image/'),
  )
  if (files.length > 0) return files
  return Array.from(transfer.items)
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null)
}

function imageNodes(view: EditorView, images: PickedImage[]): PMNode[] {
  const imageType = view.state.schema.nodes.image
  if (!imageType) return []
  return images.map((image) =>
    imageType.create({ src: image.src, alt: image.alt, title: image.alt }),
  )
}

/**
 * Inserts processed images at/after the given document position, keeping the
 * block structure valid (replacing an empty paragraph, otherwise inserting
 * after the current block).
 */
export async function insertImageFiles(view: EditorView, files: File[], pos: number) {
  const processed = await Promise.all(
    files.map((file) => processImageFile(file).catch(() => null)),
  )
  const images = processed.filter((image): image is PickedImage => image !== null)
  if (images.length === 0 || view.isDestroyed) return

  const nodes = imageNodes(view, images)
  if (nodes.length === 0) return

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
  view.dispatch(tr.scrollIntoView())
}
