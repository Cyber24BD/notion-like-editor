import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import type { Editor, Extensions, JSONContent } from '@tiptap/core'
import type { Transaction } from '@tiptap/pm/state'
import type { EditorProps } from '@tiptap/pm/view'
import { EditorContent, useEditor } from '@tiptap/react'
import { createExtensions } from '../editor/createExtensions'
import {
  featureKey,
  resolveEditorFeatures,
  type EditorFeatures,
  type ResolvedEditorFeatures,
} from '../editor/features'
import {
  imageFilesFromTransfer,
  processImageFile,
  type ImageServices,
  type ImageUploader,
} from '../editor/images/imageFiles'
import { setImageServices } from '../editor/images/imageServices'
import {
  cleanupImageUploads,
  insertImageFiles,
  SKIP_CONTENT_META,
} from '../editor/images/uploadManager'
import { stripUploadingImages } from '../editor/images/uploadSerialization'
import { defaultVideoAttrs, parseVideoFromTransfer } from '../editor/video/parseVideo'
import { defaultAudioAttrs, parseAudioFromTransfer } from '../editor/audio/parseAudio'
import { closeVideoDialog } from '../editor/video/dialogStore'
import { closeAudioDialog } from '../editor/audio/dialogStore'
import { closeIframeDialog } from '../editor/iframe/dialogStore'
import { closeBookmarkDialog } from '../editor/bookmark/dialogStore'
import { closeMathDialog } from '../editor/math/dialogStore'
import { closeMermaidDialog } from '../editor/mermaid/dialogStore'
import { PageNavContext } from '../editor/PageNavContext'
import {
  CURRENT_CONTENT_VERSION,
  isVersionedContent,
  migrateContent,
  type ContentMigration,
  type VersionedContent,
} from '../editor/contentMigration'
import type { PageReference } from '../editor/nodes/PageLink'
import { BlockHandle } from './BlockHandle'
import { BubbleToolbar } from './BubbleToolbar'
import { SlashMenu } from './SlashMenu'
import { VideoDialogHost } from './VideoDialogHost'
import { IframeDialogHost } from './IframeDialogHost'
import { BookmarkDialogHost } from './BookmarkDialogHost'
import { AudioDialogHost } from './AudioDialogHost'
import { MathDialogHost } from './MathDialogHost'
import { MermaidDialogHost } from './MermaidDialogHost'
import { CustomHtmlDialogHost } from './CustomHtmlDialogHost'
import { LazyEmojiPicker, preloadFeatureDialogs } from './lazy/LazyWidgets'
import { TableToolbar } from './TableToolbar'
import { ImageIcon } from './Icons'
import { FindReplaceBar, type FindMode } from './FindReplaceBar'
import { ShortcutsDialog } from './ShortcutsDialog'

const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }

type EditorContentInput = JSONContent | VersionedContent

function resolveContent(
  input: EditorContentInput | null | undefined,
  migrations?: Record<number, ContentMigration>,
): JSONContent {
  if (!input) return EMPTY_DOC
  if (isVersionedContent(input)) {
    return migrateContent(
      input.content,
      input.version,
      CURRENT_CONTENT_VERSION,
      migrations,
    )
  }
  return input
}

function createEditorProps(
  getServices: () => ImageServices | null,
  getFeatures: () => ResolvedEditorFeatures,
): EditorProps {
  return {
    attributes: {
      class: 'notion-editor',
      spellcheck: 'true',
      'aria-label': 'Page content',
    },
    handleDrop(view, event, _slice, moved) {
      if (moved) return false
      const files = imageFilesFromTransfer(event.dataTransfer)
      if (files.length === 0) return false
      event.preventDefault()
      const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
      void insertImageFiles(
        view,
        files,
        coords?.pos ?? view.state.selection.from,
        getServices(),
      )
      return true
    },
    handlePaste(view, event) {
      const files = imageFilesFromTransfer(event.clipboardData)
      if (files.length > 0) {
        event.preventDefault()
        void insertImageFiles(
          view,
          files,
          view.state.selection.from,
          getServices(),
        )
        return true
      }

      // Paste a recognized video link / iframe on an empty line -> real embed.
      const features = getFeatures()
      const video = features.video
        ? parseVideoFromTransfer(event.clipboardData)
        : null
      if (video) {
        const { $from } = view.state.selection
        const nodeType = view.state.schema.nodes.videoEmbed
        if (nodeType && $from.parent.isTextblock && $from.parent.content.size === 0) {
          event.preventDefault()
          const node = nodeType.create(defaultVideoAttrs(video))
          const tr = view.state.tr.replaceWith(
            $from.before($from.depth),
            $from.after($from.depth),
            node,
          )
          tr.scrollIntoView()
          view.dispatch(tr)
          return true
        }
      }

      // Paste a recognized audio link / iframe on an empty line -> real embed.
      const audio = features.audio
        ? parseAudioFromTransfer(event.clipboardData)
        : null
      if (audio) {
        const { $from } = view.state.selection
        const nodeType = view.state.schema.nodes.audioEmbed
        if (nodeType && $from.parent.isTextblock && $from.parent.content.size === 0) {
          event.preventDefault()
          const node = nodeType.create(defaultAudioAttrs(audio))
          const tr = view.state.tr.replaceWith(
            $from.before($from.depth),
            $from.after($from.depth),
            node,
          )
          tr.scrollIntoView()
          view.dispatch(tr)
          return true
        }
      }
      return false
    },
  }
}

export interface NotionEditorHandle {
  getJSON: () => JSONContent
  getDocument: () => VersionedContent
  setContent: (
    content: JSONContent | null,
    options?: { emitUpdate?: boolean },
  ) => void
  focus: (position?: 'start' | 'end' | 'all' | number) => void
  getEditor: () => Editor | null
  isEmpty: () => boolean
}

export interface NotionEditorProps {
  /** Changes to this id remount the editor with the new document. */
  documentId: string
  title?: string
  icon?: string
  cover?: string
  /** Vertical focal point for the cover image, 0 (top) to 100 (bottom). */
  coverPosition?: number
  content?: EditorContentInput | null
  /**
   * Controlled content. When supplied, external changes are applied without
   * remounting the editor. Pair with onContentChange and keep the value stable
   * while the user types. A VersionedContent wrapper is migrated before load.
   */
  value?: EditorContentInput | null
  /** Custom migration chain keyed by source version. */
  migrations?: Record<number, ContentMigration>
  onDocumentChange?: (document: VersionedContent) => void
  onTitleChange?: (title: string) => void
  onIconChange?: (icon: string) => void
  onCoverChange?: (cover: string) => void
  onCoverPositionChange?: (position: number) => void
  onContentChange?: (content: JSONContent) => void
  onNavigatePage?: (pageId: string) => void
  onCreateSubPage?: (title: string) => PageReference | null
  editable?: boolean
  className?: string
  /** Show the page icon/title header above the document. */
  showHeader?: boolean
  showBubbleToolbar?: boolean
  showTableToolbar?: boolean
  /** Mount-time block capabilities. Defaults to all features enabled. */
  features?: EditorFeatures
  /** Extra Tiptap extensions appended after the built-in extension set. */
  extensions?: Extensions
  /**
   * Optional image storage adapter. Receives the optimized file (WebP under
   * 200 KB for large images) and returns a public URL, or null to cancel.
   */
  uploadImage?: ImageUploader
  onImageUploadError?: (error: unknown, file: File) => void
  onReady?: (editor: Editor) => void
}

export const PageEditor = forwardRef<NotionEditorHandle, NotionEditorProps>(
function PageEditor({
  documentId,
  title = '',
  icon = '',
  cover = '',
  coverPosition = 50,
  content = null,
  value,
  migrations,
  onDocumentChange,
  onTitleChange,
  onIconChange,
  onCoverChange,
  onCoverPositionChange,
  onContentChange,
  onNavigatePage,
  onCreateSubPage,
  editable = true,
  className = '',
  showHeader = true,
  showBubbleToolbar = true,
  showTableToolbar = true,
  features,
  extensions: extraExtensions,
  uploadImage,
  onImageUploadError,
  onReady,
}, ref) {
  const featuresKey = featureKey(features)
  const resolvedFeatures = useMemo(
    () => resolveEditorFeatures(features),
    [featuresKey],
  )
  const extensions = useMemo(
    () => createExtensions({ features: resolvedFeatures, extensions: extraExtensions }),
    [featuresKey, extraExtensions],
  )
  const rootRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const coverDragRef = useRef<{
    startY: number
    startPosition: number
    height: number
  } | null>(null)
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [coverBusy, setCoverBusy] = useState(false)
  const [coverDragging, setCoverDragging] = useState(false)
  const [findMode, setFindMode] = useState<FindMode | null>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const safeCoverPosition = Math.max(0, Math.min(100, coverPosition))

  // Freeze the initial document so option churn never resets the editor.
  const initialInput = value !== undefined ? value : content
  const initialContent = useRef<JSONContent>(
    resolveContent(initialInput, migrations),
  )
  const initialVersion = useRef<number | null>(
    isVersionedContent(initialInput) ? initialInput.version : null,
  )
  const onContentChangeRef = useRef(onContentChange)
  onContentChangeRef.current = onContentChange
  const onDocumentChangeRef = useRef(onDocumentChange)
  onDocumentChangeRef.current = onDocumentChange
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  const skipInitialUpdate = useRef(true)
  const lastEmittedContent = useRef<JSONContent | null>(null)

  // A WeakMap keyed by the editor lets NodeViews and slash commands see the
  // uploader for this editor without prop drilling or global configuration.
  const servicesRef = useRef<ImageServices | null>(null)
  const featuresRef = useRef<ResolvedEditorFeatures>(resolvedFeatures)
  featuresRef.current = resolvedFeatures
  const editorProps = useMemo(
    () => createEditorProps(() => servicesRef.current, () => featuresRef.current),
    [],
  )

  const handleUpdate = useCallback(
    ({ editor: current, transaction }: { editor: Editor; transaction: Transaction }) => {
      // Optimistic upload progress and placeholders are intentionally not
      // persisted. Only transactions that change the saved document reach the
      // host's onChange.
      if (transaction.getMeta(SKIP_CONTENT_META)) return
      if (skipInitialUpdate.current) {
        skipInitialUpdate.current = false
        return
      }
      const next = stripUploadingImages(current.getJSON())
      lastEmittedContent.current = next
      onContentChangeRef.current?.(next)
      onDocumentChangeRef.current?.({
        version: CURRENT_CONTENT_VERSION,
        content: next,
      })
    },
    [],
  )

  const editor = useEditor(
    {
      extensions,
      content: initialContent.current,
      editable,
      editorProps,
      // Do not build the ProseMirror view until the host has a DOM. Tiptap
      // detects this automatically, but setting it explicitly keeps Next.js /
      // Remix SSR quiet and guarantees the same hydration path in production.
      immediatelyRender: false,
      onUpdate: handleUpdate,
    },
    [documentId],
  )

  useEffect(() => {
    if (!editor) return
    editor.setEditable(editable)
  }, [editor, editable])

  useEffect(() => {
    const services: ImageServices | null = uploadImage
      ? { uploader: uploadImage, onUploadError: onImageUploadError }
      : null
    servicesRef.current = services
    if (!editor) return
    setImageServices(editor, services)
    return () => setImageServices(editor, null)
  }, [editor, uploadImage, onImageUploadError])

  useEffect(() => {
    if (editor) onReadyRef.current?.(editor)
  }, [editor])

  // Persist a migration as soon as a legacy versioned document is mounted.
  useEffect(() => {
    if (!editor) return
    if (
      initialVersion.current !== null &&
      initialVersion.current < CURRENT_CONTENT_VERSION
    ) {
      const next = stripUploadingImages(editor.getJSON())
      onContentChangeRef.current?.(next)
      onDocumentChangeRef.current?.({
        version: CURRENT_CONTENT_VERSION,
        content: next,
      })
    }
  }, [editor])

  useEffect(() => {
    if (!editor) return
    return () => cleanupImageUploads(editor.view)
  }, [editor])

  // Controlled content: apply external changes without remounting. Echoes of
  // our own onContentChange are ignored by object identity (and structurally
  // for consumers that clone the JSON before storing it).
  useEffect(() => {
    if (!editor || value === undefined) return
    const next = resolveContent(value, migrations)
    if (next === lastEmittedContent.current) return
    if (JSON.stringify(next) === JSON.stringify(stripUploadingImages(editor.getJSON()))) {
      return
    }
    editor.commands.setContent(next, { emitUpdate: false })
  }, [editor, value, migrations])

  useImperativeHandle(
    ref,
    () => ({
      getJSON: () => stripUploadingImages(editor?.getJSON() ?? EMPTY_DOC),
      getDocument: () => ({
        version: CURRENT_CONTENT_VERSION,
        content: stripUploadingImages(editor?.getJSON() ?? EMPTY_DOC),
      }),
      setContent: (next, options) => {
        if (!editor) return
        editor.commands.setContent(next ?? EMPTY_DOC, {
          emitUpdate: options?.emitUpdate ?? true,
        })
      },
      focus: (position = 'end') => {
        editor?.chain().focus(position).run()
      },
      getEditor: () => editor ?? null,
      isEmpty: () => editor?.isEmpty ?? true,
    }),
    [editor],
  )

  // Don't call onChange for Tiptap's initial content normalization.
  useEffect(() => {
    if (!editor) return
    const timer = window.setTimeout(() => {
      skipInitialUpdate.current = false
    }, 0)
    return () => window.clearTimeout(timer)
  }, [editor])

  useEffect(() => {
    const timer = window.setTimeout(
      () => preloadFeatureDialogs(featuresRef.current),
      1500,
    )
    return () => {
      window.clearTimeout(timer)
      closeVideoDialog()
      closeAudioDialog()
      closeIframeDialog()
      closeBookmarkDialog()
      closeMathDialog()
      closeMermaidDialog()
    }
  }, [])

  // Expose workspace actions to NodeViews / slash commands without prop drilling.
  useEffect(() => {
    if (!editor) return
    const storage = editor.storage.pageLink
    if (!storage) return
    storage.createSubPage = onCreateSubPage ?? null
    return () => {
      storage.createSubPage = null
    }
  }, [editor, onCreateSubPage])

  useEffect(() => {
    const el = titleRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [title])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const root = rootRef.current
      if (!root?.contains(document.activeElement)) return
      const mod = event.metaKey || event.ctrlKey
      if (!mod) return
      const key = event.key.toLowerCase()
      if (!event.shiftKey && key === 'f') {
        event.preventDefault()
        setFindMode('find')
      } else if (!event.shiftKey && key === 'h') {
        event.preventDefault()
        setFindMode('replace')
      } else if (key === '/' || event.code === 'Slash') {
        event.preventDefault()
        setShortcutsOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])

  useEffect(() => {
    if (showHeader && !title) {
      titleRef.current?.focus()
    }
    // Only on mount for a fresh page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const openShortcuts = () => setShortcutsOpen(true)
    const openFind = () => setFindMode('find')
    const openReplace = () => setFindMode('replace')
    window.addEventListener('notion:shortcuts', openShortcuts)
    window.addEventListener('notion:find', openFind)
    window.addEventListener('notion:replace', openReplace)
    return () => {
      window.removeEventListener('notion:shortcuts', openShortcuts)
      window.removeEventListener('notion:find', openFind)
      window.removeEventListener('notion:replace', openReplace)
    }
  }, [])

  const navigatePage = onNavigatePage ?? (() => undefined)
  const createSubPage = onCreateSubPage ?? (() => null)
  const navValue = useMemo(
    () => ({ navigate: navigatePage, createSubPage }),
    [navigatePage, createSubPage],
  )

  const focusEnd = useCallback(() => {
    editor?.chain().focus('end').run()
  }, [editor])

  const handleBackgroundClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (
      target === event.currentTarget ||
      target.classList.contains('notion-page-content') ||
      target.classList.contains('notion-page-bottom-spacer')
    ) {
      focusEnd()
    }
  }

  const chooseCover = () => {
    coverInputRef.current?.click()
  }

  const handleCoverFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !onCoverChange) return
    setCoverBusy(true)
    try {
      const picked = await processImageFile(file, servicesRef.current)
      if (picked) onCoverChange(picked.src)
    } finally {
      setCoverBusy(false)
    }
  }

  const handleCoverPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!onCoverPositionChange) return
    const target = event.target as HTMLElement
    if (target.closest('.notion-page-cover-actions')) return
    event.preventDefault()
    event.currentTarget.focus()
    event.currentTarget.setPointerCapture(event.pointerId)
    coverDragRef.current = {
      startY: event.clientY,
      startPosition: safeCoverPosition,
      height: Math.max(1, event.currentTarget.getBoundingClientRect().height),
    }
    setCoverDragging(true)
  }

  const handleCoverPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const drag = coverDragRef.current
    if (!drag || !onCoverPositionChange) return
    const next =
      drag.startPosition + ((drag.startY - event.clientY) / drag.height) * 100
    onCoverPositionChange(Math.max(0, Math.min(100, Math.round(next))))
  }

  const finishCoverDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!coverDragRef.current) return
    coverDragRef.current = null
    setCoverDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleCoverKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!onCoverPositionChange) return
    let next = safeCoverPosition
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        next -= event.shiftKey ? 10 : 2
        break
      case 'ArrowDown':
      case 'ArrowRight':
        next += event.shiftKey ? 10 : 2
        break
      case 'PageUp':
        next -= 10
        break
      case 'PageDown':
        next += 10
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = 100
        break
      default:
        return
    }
    event.preventDefault()
    event.stopPropagation()
    onCoverPositionChange(Math.max(0, Math.min(100, next)))
  }

  return (
    <div className="notion-editor-root" ref={rootRef}>
      <div
        className={`notion-page ${className}`.trim()}
        data-cover={cover ? 'true' : 'false'}
      >
      <input
        ref={coverInputRef}
        className="notion-page-cover-input"
        type="file"
        accept="image/*"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void handleCoverFile(event)}
      />
      <div
        className="notion-page-scroll notion-scroll"
        ref={setScrollEl}
        onClick={handleBackgroundClick}
      >
        {cover && (
          <div
            className="notion-page-cover"
            data-dragging={coverDragging ? 'true' : 'false'}
            data-repositionable={onCoverPositionChange ? 'true' : 'false'}
          >
            <div
              className="notion-page-cover__position"
              role={onCoverPositionChange ? 'slider' : undefined}
              tabIndex={onCoverPositionChange ? 0 : undefined}
              aria-label="Cover position"
              aria-valuemin={onCoverPositionChange ? 0 : undefined}
              aria-valuemax={onCoverPositionChange ? 100 : undefined}
              aria-valuenow={onCoverPositionChange ? safeCoverPosition : undefined}
              aria-valuetext={
                onCoverPositionChange ? `${safeCoverPosition}%` : undefined
              }
              aria-orientation="vertical"
              onPointerDown={handleCoverPointerDown}
              onPointerMove={handleCoverPointerMove}
              onPointerUp={finishCoverDrag}
              onPointerCancel={finishCoverDrag}
              onKeyDown={handleCoverKeyDown}
            >
              <img
                className="notion-page-cover__image"
                src={cover}
                alt=""
                draggable={false}
                style={{ objectPosition: `center ${safeCoverPosition}%` }}
              />
            </div>
            <div
              className="notion-page-cover-actions"
              onPointerDown={(event) => event.stopPropagation()}
            >
              {onCoverChange && (
                <button
                  type="button"
                  className="notion-page-cover-action"
                  disabled={coverBusy}
                  onClick={chooseCover}
                >
                  {coverBusy ? 'Uploading…' : 'Change cover'}
                </button>
              )}
              {onCoverPositionChange && (
                <span className="notion-page-cover-hint">
                  Drag or use arrow keys
                </span>
              )}
              {onCoverChange && (
                <button
                  type="button"
                  className="notion-page-cover-action"
                  onClick={() => {
                    onCoverChange('')
                    onCoverPositionChange?.(50)
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        )}
        <div
          className="notion-page-content"
          data-cover={cover ? 'true' : 'false'}
        >
          {showHeader && (
          <div className="notion-page-header">
            {onCoverChange && !cover && (
              <button
                type="button"
                className="notion-page-add-cover"
                disabled={coverBusy}
                onClick={chooseCover}
              >
                <ImageIcon size={14} />
                {coverBusy ? 'Uploading…' : 'Add cover'}
              </button>
            )}
            <div className="notion-page-icon-slot">
              {icon ? (
                onIconChange ? (
                  <button
                    type="button"
                    className="notion-page-icon"
                    onClick={() => setIconPickerOpen((open) => !open)}
                    aria-label="Change page icon"
                  >
                    {icon}
                  </button>
                ) : (
                  <span className="notion-page-icon" aria-hidden="true">
                    {icon}
                  </span>
                )
              ) : onIconChange ? (
                <button
                  type="button"
                  className="notion-page-add-icon"
                  onClick={() => setIconPickerOpen(true)}
                >
                  <span aria-hidden="true">😊</span> Add icon
                </button>
              ) : null}
              {iconPickerOpen && (
                <LazyEmojiPicker
                  className="emoji-picker--page"
                  onSelect={(emoji) => {
                    onIconChange?.(emoji)
                    setIconPickerOpen(false)
                  }}
                  onRemove={() => {
                    onIconChange?.('')
                    setIconPickerOpen(false)
                  }}
                  onClose={() => setIconPickerOpen(false)}
                />
              )}
            </div>

            <textarea
              ref={titleRef}
              className="notion-page-title"
              value={title}
              rows={1}
              placeholder="Untitled"
              spellCheck={false}
              readOnly={!onTitleChange}
              onChange={(event) => onTitleChange?.(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  editor?.chain().focus('start').run()
                }
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  editor?.chain().focus('start').run()
                }
              }}
              aria-label="Page title"
            />
          </div>
          )}

          <div className="notion-page-body">
            {editor && (
              <PageNavContext.Provider value={navValue}>
                <EditorContent editor={editor} />
              </PageNavContext.Provider>
            )}
            {editor && <BlockHandle editor={editor} />}
            {editor && showBubbleToolbar && <BubbleToolbar editor={editor} scrollTarget={scrollEl} />}
            {editor && showTableToolbar && <TableToolbar editor={editor} />}
          </div>

          <div className="notion-page-bottom-spacer" aria-hidden="true" />
        </div>
      </div>
      {editor && findMode && (
        <FindReplaceBar
          editor={editor}
          mode={findMode}
          onModeChange={setFindMode}
          onClose={() => setFindMode(null)}
        />
      )}
      {shortcutsOpen && (
        <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />
      )}
      <SlashMenu />
      <VideoDialogHost />
      <AudioDialogHost />
      <IframeDialogHost />
      <BookmarkDialogHost />
      <MathDialogHost />
      <MermaidDialogHost />
      <CustomHtmlDialogHost />
      </div>
    </div>
  )
})

/**
 * Public, remount-by-document API used by the library entry. Keeping the key on
 * the document id means switching documents always starts from the right content.
 */
export const NotionEditor = forwardRef<NotionEditorHandle, NotionEditorProps>(
  function NotionEditor(props, ref) {
    return (
      <PageEditor
        key={`${props.documentId}:${featureKey(props.features)}`}
        ref={ref}
        {...props}
      />
    )
  },
)
