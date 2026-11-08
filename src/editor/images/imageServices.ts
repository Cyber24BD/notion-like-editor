import type { Editor } from '@tiptap/core'
import type { ImageServices } from './imageFiles'

/**
 * Per-editor image services. A WeakMap keeps multiple editor instances with
 * different upload adapters isolated from each other.
 */
const servicesByEditor = new WeakMap<Editor, ImageServices>()

export function setImageServices(
  editor: Editor,
  services: ImageServices | null,
): void {
  if (services) servicesByEditor.set(editor, services)
  else servicesByEditor.delete(editor)
}

export function getImageServices(editor: Editor): ImageServices | null {
  return servicesByEditor.get(editor) ?? null
}
