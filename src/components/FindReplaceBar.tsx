import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import type { Editor } from '@tiptap/core'
import { createNotionPortal } from './NotionPortal'
import { ChevronDown, ChevronUp, Search, X } from './Icons'
import { getSearchState, type SearchPluginState } from '../editor/search/NotionSearch'

export type FindMode = 'find' | 'replace'

interface FindReplaceBarProps {
  editor: Editor
  mode: FindMode
  onModeChange: (mode: FindMode) => void
  onClose: () => void
}

export function FindReplaceBar({
  editor,
  mode,
  onModeChange,
  onClose,
}: FindReplaceBarProps) {
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [status, setStatus] = useState<SearchPluginState | undefined>(() =>
    getSearchState(editor.state),
  )
  const queryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      queryRef.current?.focus()
      queryRef.current?.select()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const update = () => setStatus(getSearchState(editor.state))
    update()
    editor.on('transaction', update)
    return () => {
      editor.off('transaction', update)
    }
  }, [editor])

  useEffect(() => {
    editor.commands.setSearch(query)
  }, [editor, query])

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      editor.commands.clearSearch()
      onClose()
    }
    window.addEventListener('keydown', onEscape, true)
    return () => window.removeEventListener('keydown', onEscape, true)
  }, [editor, onClose])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()
      if (mod && !event.shiftKey && key === 'h') {
        event.preventDefault()
        onModeChange('replace')
      } else if (mod && !event.shiftKey && key === 'f') {
        event.preventDefault()
        queryRef.current?.focus()
        queryRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onModeChange])

  const close = () => {
    editor.commands.clearSearch()
    onClose()
  }

  const move = (direction: 1 | -1) => {
    editor.commands.searchNext(direction)
  }

  const onQueryKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      move(event.shiftKey ? -1 : 1)
    }
  }

  const replaceOne = () => {
    editor.commands.replaceCurrentMatch(replacement)
  }

  const replaceAll = () => {
    editor.commands.replaceAllMatches(replacement)
  }

  const count = status?.matches.length ?? 0
  const current = status?.current ?? 0
  const hasQuery = query.length > 0
  const hasMatches = count > 0

  return createNotionPortal(
    <div className="find-bar notion-popover" role="search" aria-label="Find in page">
      <div className="find-bar__row">
        <Search size={14} className="find-bar__search-icon" />
        <input
          ref={queryRef}
          className="find-bar__input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onQueryKeyDown}
          placeholder="Find in page"
          aria-label="Find in page"
          spellCheck={false}
        />
        <span className="find-bar__count" aria-live="polite">
          {hasQuery ? (hasMatches ? `${current + 1} of ${count}` : 'No results') : ''}
        </span>
        <div className="find-bar__nav">
          <button
            type="button"
            className="find-bar__btn"
            aria-label="Previous match"
            disabled={!hasMatches}
            onClick={() => move(-1)}
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            className="find-bar__btn"
            aria-label="Next match"
            disabled={!hasMatches}
            onClick={() => move(1)}
          >
            <ChevronDown size={14} />
          </button>
        </div>
        <button
          type="button"
          className="find-bar__btn find-bar__btn--text"
          aria-pressed={mode === 'replace'}
          aria-label="Toggle replace"
          onClick={() => onModeChange(mode === 'replace' ? 'find' : 'replace')}
        >
          Replace
        </button>
        <button
          type="button"
          className="find-bar__btn"
          aria-label="Close find"
          onClick={close}
        >
          <X size={14} />
        </button>
      </div>

      {mode === 'replace' && (
        <div className="find-bar__row find-bar__row--replace">
          <input
            className="find-bar__input"
            value={replacement}
            onChange={(event) => setReplacement(event.target.value)}
            placeholder="Replace with"
            aria-label="Replace with"
            spellCheck={false}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                close()
              } else if (event.key === 'Enter') {
                event.preventDefault()
                replaceOne()
              }
            }}
          />
          <button
            type="button"
            className="find-bar__btn find-bar__btn--text"
            disabled={!hasQuery || !hasMatches}
            onClick={replaceOne}
          >
            Replace
          </button>
          <button
            type="button"
            className="find-bar__btn find-bar__btn--text"
            disabled={!hasQuery || !hasMatches}
            onClick={replaceAll}
          >
            Replace all
          </button>
        </div>
      )}
    </div>,
  )
}
