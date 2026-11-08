import './notion-editor.css'

export { NotionEditor } from '../components/PageEditor'
export type {
  NotionEditorHandle,
  NotionEditorProps,
} from '../components/PageEditor'
export type {
  ImageUploadContext,
  ImageUploadResult,
  ImageUploader,
  UploadedImage,
} from '../editor/images/imageFiles'
export {
  CURRENT_CONTENT_VERSION,
  DEFAULT_CONTENT_MIGRATIONS,
  currentDocument,
  isVersionedContent,
  migrateContent,
  migrateVersionedContent,
} from '../editor/contentMigration'
export type {
  ContentMigration,
  VersionedContent,
} from '../editor/contentMigration'
export type { PageReference } from '../editor/nodes/PageLink'
export type { Editor, JSONContent } from '@tiptap/core'
