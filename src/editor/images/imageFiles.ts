export interface PickedImage {
  src: string
  alt: string
  width: number
  height: number
}

export interface ImageUploadContext {
  /** The untouched file the user selected. */
  originalFile: File
  /** Dimensions of the file passed to the uploader. */
  width: number
  height: number
  alt: string
  /** Aborted when the user cancels or leaves the page. */
  signal?: AbortSignal
  /** Optional 0–100 progress callback for hosts that can report it. */
  onProgress?: (progress: number) => void
}

export interface UploadedImage {
  src: string
  width?: number
  height?: number
  alt?: string
}

export type ImageUploadResult = string | UploadedImage | null | undefined

/**
 * Receives the file the editor would otherwise store locally. Large raster
 * images arrive as a WebP under 200 KB; small images, SVGs and GIFs arrive as
 * the original file. `context.originalFile` is always the untouched upload.
 */
export type ImageUploader = (
  file: File,
  context: ImageUploadContext,
) => ImageUploadResult | Promise<ImageUploadResult>

export interface ImageServices {
  uploader?: ImageUploader
  onUploadError?: (error: unknown, file: File) => void
}

export interface PreparedImage {
  file: File
  alt: string
  width: number
  height: number
}

const MAX_IMAGE_BYTES = 200 * 1024
const MAX_DIMENSION = 1600
// Animated GIFs and SVGs are passed through; keep them from exhausting localStorage.
const MAX_PASSTHROUGH_BYTES = 1_500_000

const QUALITY_STEPS = [0.86, 0.72, 0.58, 0.46]
const DIMENSION_STEPS = [MAX_DIMENSION, 1280, 1024, 860, 720, 600, 480, 380, 300]

function readAsDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read that file.'))
    reader.readAsDataURL(blob)
  })
}

function baseName(file: File): string {
  return file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Image'
}

export function imageAltFromFile(file: File): string {
  return baseName(file)
}

function outputFileName(blob: Blob, original: File): string {
  const extension =
    blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp'
  return `${baseName(original)}.${extension}`
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

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

function drawToCanvas(
  image: HTMLImageElement,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available in this browser.')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, width, height)
  return canvas
}

/**
 * Prepares an image for storage/upload. Images that are already 200 KB or
 * smaller are kept untouched. Larger raster images are converted to WebP and
 * progressively downscaled until the encoded image is under 200 KB. SVG is kept
 * as-is because it is a vector format, and GIFs are kept as-is so animation is
 * not silently flattened.
 */
export async function prepareImageFile(
  file: File,
): Promise<PreparedImage | null> {
  if (!file.type.startsWith('image/')) return null
  const alt = baseName(file)
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await loadImage(objectUrl)
    const naturalWidth = image.naturalWidth || 1
    const naturalHeight = image.naturalHeight || 1
    const isVector = file.type === 'image/svg+xml'
    const isGif = file.type === 'image/gif'

    if (isVector || isGif || file.size <= MAX_IMAGE_BYTES) {
      if ((isVector || isGif) && file.size > MAX_PASSTHROUGH_BYTES) {
        throw new Error(
          'That file is too large to keep locally. Try a smaller GIF, SVG or image.',
        )
      }
      return { file, alt, width: naturalWidth, height: naturalHeight }
    }

    const longEdge = Math.max(naturalWidth, naturalHeight)
    const seen = new Set<string>()

    for (const dimension of DIMENSION_STEPS) {
      const scale = Math.min(1, dimension / longEdge)
      const width = Math.max(1, Math.round(naturalWidth * scale))
      const height = Math.max(1, Math.round(naturalHeight * scale))
      const key = `${width}x${height}`
      if (seen.has(key)) continue
      seen.add(key)

      for (const quality of QUALITY_STEPS) {
        const canvas = drawToCanvas(image, width, height)
        const webp = await canvasToBlob(canvas, 'image/webp', quality)
        if (!webp) continue

        // Browsers that cannot encode WebP fall back to their source format.
        const blob =
          webp.type === 'image/webp'
            ? webp
            : await canvasToBlob(
                canvas,
                file.type === 'image/png' ? 'image/png' : 'image/jpeg',
                quality,
              )
        if (!blob) continue
        if (blob.size <= MAX_IMAGE_BYTES) {
          const preparedFile = new File(
            [blob],
            outputFileName(blob, file),
            { type: blob.type || 'image/webp' },
          )
          return { file: preparedFile, alt, width, height }
        }
      }
    }

    throw new Error(
      'That image could not be compressed under 200 KB. Try a smaller image or a screenshot.',
    )
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function processImageFile(
  file: File,
  services?: ImageServices | null,
): Promise<PickedImage | null> {
  let prepared: PreparedImage | null
  try {
    prepared = await prepareImageFile(file)
  } catch (error) {
    window.alert(
      error instanceof Error
        ? error.message
        : 'That file could not be used as an image.',
    )
    return null
  }

  if (!prepared) return null

  if (services?.uploader) {
    try {
      const uploaded = await services.uploader(prepared.file, {
        originalFile: file,
        width: prepared.width,
        height: prepared.height,
        alt: prepared.alt,
      })
      if (uploaded == null) return null
      const result = typeof uploaded === 'string' ? { src: uploaded } : uploaded
      if (!result.src) {
        throw new Error('The image upload did not return a URL.')
      }
      return {
        src: result.src,
        alt: result.alt ?? prepared.alt,
        width: result.width ?? prepared.width,
        height: result.height ?? prepared.height,
      }
    } catch (error) {
      if (services.onUploadError) {
        services.onUploadError(error, file)
      } else {
        window.alert('Image upload failed. Please try again.')
      }
      return null
    }
  }

  try {
    const src = await readAsDataURL(prepared.file)
    return {
      src,
      alt: prepared.alt,
      width: prepared.width,
      height: prepared.height,
    }
  } catch {
    window.alert('That file could not be used as an image.')
    return null
  }
}

export interface CropFraction {
  x: number
  y: number
  width: number
  height: number
}

/** Crops a (data-URL) image and re-runs the compression/upload pipeline. */
export async function cropImageSource(
  src: string,
  crop: CropFraction,
  services?: ImageServices | null,
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
    const processed = await processImageFile(file, services)
    return processed?.src ?? null
  } catch {
    return null
  }
}

/** Opens the OS picker and resolves with the raw file. Must be user-gesture driven. */
export function pickImageFileRaw(): Promise<File | null> {
  return openImagePicker()
}

/** Opens the picker and processes/upload the chosen file. */
export async function pickImageFile(
  services?: ImageServices | null,
): Promise<PickedImage | null> {
  const file = await openImagePicker()
  if (!file) return null
  return processImageFile(file, services)
}

function openImagePicker(): Promise<File | null> {
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

    const finish = (value: File | null) => {
      if (settled) return
      settled = true
      window.removeEventListener('focus', handleFocus)
      window.setTimeout(() => input.remove(), 0)
      resolve(value)
    }

    input.addEventListener('change', () => {
      finish(input.files?.[0] ?? null)
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
