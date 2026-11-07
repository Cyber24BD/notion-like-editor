import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import type { Editor, JSONContent } from '@tiptap/core'
import type { EditorProps } from '@tiptap/pm/view'
import { EditorContent, useEditor } from '@tiptap/react'
import { createExtensions } from '../editor/createExtensions'
import { imageFilesFromTransfer, insertImageFiles } from '../editor/images/imageFiles'
import { defaultVideoAttrs, parseVideoFromTransfer } from '../editor/video/parseVideo'
import { defaultAudioAttrs, parseAudioFromTransfer } from '../editor/audio/parseAudio'
import { closeVideoDialog } from '../editor/video/dialogStore'
import { closeAudioDialog } from '../editor/audio/dialogStore'
import { closeIframeDialog } from '../editor/iframe/dialogStore'
import { closeBookmarkDialog } from '../editor/bookmark/dialogStore'
import { closeMathDialog } from '../editor/math/dialogStore'
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
import { LazyEmojiPicker, preloadFeatureDialogs } from './lazy/LazyWidgets'
import { TableToolbar } from './TableToolbar'

const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }

const EDITOR_PROPS: EditorProps = {
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
    void insertImageFiles(view, files, coords?.pos ?? view.state.selection.from)
    return true
  },
  handlePaste(view, event) {
    const files = imageFilesFromTransfer(event.clipboardData)
    if (files.length > 0) {
      event.preventDefault()
      void insertImageFiles(view, files, view.state.selection.from)
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

export interface NotionEditorProps {
  /** Changes to this id remount the editor with the new document. */
  documentId: string
  title?: string
  icon?: string
  content?: JSONContent | null
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
}

function PageEditor({
  documentId,
  title = '',
  icon = '',
  content = null,
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
}: NotionEditorProps) {
  const extensions = useMemo(() => createExtensions(), [])
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)

  // Freeze the initial document so option churn never resets the editor.
  const initialContent = useRef<JSONContent>(content ?? EMPTY_DOC)
  const onContentChangeRef = useRef(onContentChange)
  onContentChangeRef.current = onContentChange
  const skipInitialUpdate = useRef(true)
  const handleUpdate = useCallback(
    ({ editor: current }: { editor: Editor }) => {
      if (skipInitialUpdate.current) {
        skipInitialUpdate.current = false
        return
      }
      onContentChangeRef.current?.(current.getJSON())
    },
    [],
  )

  const editor = useEditor(
    {
      extensions,
      content: initialContent.current,
      editable,
      editorProps: EDITOR_PROPS,
      onUpdate: handleUpdate,
    },
    [documentId],
  )

  useEffect(() => {
    if (!editor) return
    editor.setEditable(editable)
  }, [editor, editable])

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
    </div>
  )
}

/**
 * Public, remount-by-document API used by the library entry. Keeping the key on
 * the document id means switching documents always starts from the right content.
 */
export function NotionEditor(props: NotionEditorProps) {
  return <PageEditor key={props.documentId} {...props} />
}
