import type { JSONContent } from '@tiptap/core'

const TRANSIENT_UPLOAD_ATTRS = [
  'uploadId',
  'uploadState',
  'uploadProgress',
  'uploadError',
  'uploadPreview',
] as const

function withoutUploadAttrs(
  attrs: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const next = { ...(attrs ?? {}) }
  for (const key of TRANSIENT_UPLOAD_ATTRS) delete next[key]
  return next
}

function stripNode(node: JSONContent): JSONContent | null {
  if (node.type === 'image' && node.attrs?.uploadState) {
    // While replacing an existing image, keep the persisted old source. For a
    // brand-new upload there is no source yet, so the whole node is transient.
    if (!node.attrs.src) return null
    return { ...node, attrs: withoutUploadAttrs(node.attrs) }
  }

  if (!node.content) return node
  let changed = false
  const content: JSONContent[] = []
  for (const child of node.content) {
    const next = stripNode(child)
    if (next !== child) changed = true
    if (next) content.push(next)
  }
  return changed ? { ...node, content } : node
}

/**
 * Returns the document shape that should be persisted. Uploading image nodes
 * carry preview blob URLs and transient progress attrs; those must never reach
 * storage or a host application.
 */
export function stripUploadingImages(content: JSONContent): JSONContent {
  return stripNode(content) ?? { type: 'doc', content: [] }
}
