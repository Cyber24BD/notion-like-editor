import type { JSONContent } from '@tiptap/core'
import { stripUploadingImages } from './images/uploadSerialization'

/**
 * Bump this when persisted node attributes or node types change.
 *
 * Hosts should store documents as `{ version, content }` and pass the wrapper
 * back through `value`/`content`. Raw JSONContent remains supported for
 * backwards compatibility, but raw documents are treated as current.
 */
export const CURRENT_CONTENT_VERSION = 1

export type ContentMigration = (content: JSONContent) => JSONContent

export interface VersionedContent {
  version: number
  content: JSONContent
}

export const DEFAULT_CONTENT_MIGRATIONS: Record<number, ContentMigration> = {
  0: migrateV0,
}

export function isVersionedContent(value: unknown): value is VersionedContent {
  if (!value || typeof value !== 'object') return false
  const candidate = value as { version?: unknown; content?: unknown }
  return (
    typeof candidate.version === 'number' &&
    Number.isFinite(candidate.version) &&
    Boolean(candidate.content) &&
    typeof candidate.content === 'object'
  )
}

function migrateNode(node: JSONContent): JSONContent {
  let next = node

  // Early seed data used `numberedList`; Tiptap's node is orderedList.
  if (next.type === 'numberedList') {
    next = { ...next, type: 'orderedList' }
  }

  if (next.content) {
    const content = next.content.map(migrateNode)
    if (content.some((child, index) => child !== next.content![index])) {
      next = { ...next, content }
    }
  }

  return next
}

/** Version 0 -> 1: normalize legacy list names and drop transient upload state. */
function migrateV0(content: JSONContent): JSONContent {
  return stripUploadingImages(migrateNode(content))
}

/**
 * Applies migrations from `fromVersion` up to (but not including)
 * `toVersion`. Unknown migrations are skipped with a console warning instead of
 * throwing in the middle of mounting an editor.
 */
export function migrateContent(
  content: JSONContent,
  fromVersion: number,
  toVersion: number = CURRENT_CONTENT_VERSION,
  migrations: Record<number, ContentMigration> = DEFAULT_CONTENT_MIGRATIONS,
): JSONContent {
  if (fromVersion >= toVersion) return content

  let next = content
  for (let version = fromVersion; version < toVersion; version += 1) {
    const migrate = migrations[version]
    if (!migrate) {
      console.warn(
        `No content migration registered from version ${version} to ${version + 1}.`,
      )
      break
    }
    next = migrate(next)
  }
  return next
}

export function migrateVersionedContent(
  document: VersionedContent,
  migrations: Record<number, ContentMigration> = DEFAULT_CONTENT_MIGRATIONS,
  toVersion: number = CURRENT_CONTENT_VERSION,
): VersionedContent {
  return {
    version: toVersion,
    content: migrateContent(document.content, document.version, toVersion, migrations),
  }
}

export function currentDocument(content: JSONContent): VersionedContent {
  return { version: CURRENT_CONTENT_VERSION, content }
}
