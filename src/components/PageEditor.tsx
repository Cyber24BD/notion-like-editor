import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import type { Editor, JSONContent } from '@tiptap/core'
import type { Transaction } from '@tiptap/pm/state'
import type { EditorProps } from '@tiptap/pm/view'
import { EditorContent, useEditor } from '@tiptap/react'
import { createExtensions } from '../editor/createExtensions'
import {
  imageFilesFromTransfer,
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
import { LazyEmojiPicker, preloadFeatureDialogs } from './lazy/LazyWidgets'
import { TableToolbar } from './TableToolbar'

const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }

function createEditorProps(
  getServices: () => ImageServices | null,
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
      const video = parseVideoFromTransfer(event.clipboardData)
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
      const audio = parseAudioFromTransfer(event.clipboardData)
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
  content?: JSONContent | null
  /**
   * Controlled content. When supplied, external changes are applied without
   * remounting the editor. Pair with onContentChange and keep the value stable
   * while the user types.
   */
  value?: JSONContent | null
  onTitleChange?: (title: string) => void
  onIconChange?: (icon: string) => void
  onContentChange?: (content: JSONContent) => void
  onNavigatePage?: (pageId: string) => void
  onCreateSubPage?: (title: string) => PageReference | null
  editable?: boolean
  className?: string
  /** Show the page icon/title header above the document. */
  showHeader?: boolean
  showBubbleToolbar?: boolean
  showTableToolbar?: boolean
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
  content = null,
  value,
  onTitleChange,
  onIconChange,
  onContentChange,
  onNavigatePage,
  onCreateSubPage,
  editable = true,
  className = '',
  showHeader = true,
  showBubbleToolbar = true,
  showTableToolbar = true,
  uploadImage,
  onImageUploadError,
  onReady,
}, ref) {
  const extensions = useMemo(() => createExtensions(), [])
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)

  // Freeze the initial document so option churn never resets the editor.
  const initialContent = useRef<JSONContent>(
    (value !== undefined ? value : content) ?? EMPTY_DOC,
  )
  const onContentChangeRef = useRef(onContentChange)
  onContentChangeRef.current = onContentChange
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  const skipInitialUpdate = useRef(true)
  const lastEmittedContent = useRef<JSONContent | null>(null)

  // A WeakMap keyed by the editor lets NodeViews and slash commands see the
  // uploader for this editor without prop drilling or global configuration.
  const servicesRef = useRef<ImageServices | null>(null)
  const editorProps = useMemo(
    () => createEditorProps(() => servicesRef.current),
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
    },
    [],
  )

  const editor = useEditor(
    {
      extensions,
      content: initialContent.current,
      editable,
      editorProps,
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

  useEffect(() => {
    if (!editor) return
    return () => cleanupImageUploads(editor.view)
  }, [editor])

  // Controlled content: apply external changes without remounting. Echoes of
  // our own onContentChange are ignored by object identity (and structurally
  // for consumers that clone the JSON before storing it).
  useEffect(() => {
    if (!editor || value === undefined) return
    const next = value ?? EMPTY_DOC
    if (next === lastEmittedContent.current) return
    if (JSON.stringify(next) === JSON.stringify(stripUploadingImages(editor.getJSON()))) {
      return
    }
    editor.commands.setContent(next, { emitUpdate: false })
  }, [editor, value])

  useImperativeHandle(
    ref,
    () => ({
      getJSON: () => stripUploadingImages(editor?.getJSON() ?? EMPTY_DOC),
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
    const timer = window.setTimeout(preloadFeatureDialogs, 1500)
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
    if (showHeader && !title) {
      titleRef.current?.focus()
    }
    // Only on mount for a fresh page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      target.classList.contains('page-content') ||
      target.classList.contains('page-bottom-spacer')
    ) {
      focusEnd()
    }
  }

  return (
    <div className={`page ${className}`.trim()}>
      <div
        className="page-scroll notion-scroll"
        ref={setScrollEl}
        onClick={handleBackgroundClick}
      >
        <div className="page-content">
          {showHeader && (
          <div className="page-header">
            <div className="page-icon-slot">
              {icon ? (
                onIconChange ? (
                  <button
                    type="button"
                    className="page-icon"
                    onClick={() => setIconPickerOpen((open) => !open)}
                    aria-label="Change page icon"
                  >
                    {icon}
                  </button>
                ) : (
                  <span className="page-icon" aria-hidden="true">
                    {icon}
                  </span>
                )
              ) : onIconChange ? (
                <button
                  type="button"
                  className="page-add-icon"
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
              className="page-title"
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

          <div className="page-body">
            {editor && (
              <PageNavContext.Provider value={navValue}>
                <EditorContent editor={editor} />
              </PageNavContext.Provider>
            )}
            {editor && <BlockHandle editor={editor} />}
            {editor && showBubbleToolbar && <BubbleToolbar editor={editor} scrollTarget={scrollEl} />}
            {editor && showTableToolbar && <TableToolbar editor={editor} />}
          </div>

          <div className="page-bottom-spacer" aria-hidden="true" />
        </div>
      </div>
      <SlashMenu />
      <VideoDialogHost />
      <AudioDialogHost />
      <IframeDialogHost />
      <BookmarkDialogHost />
      <MathDialogHost />
      <MermaidDialogHost />
    </div>
  )
})

/**
 * Public, remount-by-document API used by the library entry. Keeping the key on
 * the document id means switching documents always starts from the right content.
 */
export const NotionEditor = forwardRef<NotionEditorHandle, NotionEditorProps>(
  function NotionEditor(props, ref) {
    return <PageEditor key={props.documentId} ref={ref} {...props} />
  },
)
