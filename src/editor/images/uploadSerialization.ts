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

function hasTransientUploadAttrs(
  attrs: Record<string, unknown> | undefined,
): boolean {
  return Boolean(
    attrs && TRANSIENT_UPLOAD_ATTRS.some((key) => Object.hasOwn(attrs, key)),
  )
}

function stripNode(node: JSONContent): JSONContent | null {
  if (node.type === 'image') {
    // A brand-new upload has no persisted source. While replacing an existing
    // image, keep the old source until the new upload succeeds.
    if (node.attrs?.uploadState && !node.attrs.src) return null
    if (hasTransientUploadAttrs(node.attrs)) {
      return { ...node, attrs: withoutUploadAttrs(node.attrs) }
    }
    return node
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
