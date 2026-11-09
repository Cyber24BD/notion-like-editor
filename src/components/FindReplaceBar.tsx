import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react'
import type { Editor } from '@tiptap/core'
import { createNotionPortal } from './NotionPortal'
import { ChevronDown, ChevronUp, Search, X } from './Icons'
import {
  DEFAULT_SEARCH_OPTIONS,
  findTextMatches,
  formatSearchError,
  getSearchState,
  type ResolvedSearchOptions,
  type SearchMatch,
  type SearchPluginState,
} from '../editor/search/NotionSearch'

export type FindMode = 'find' | 'replace'

interface FindReplaceBarProps {
  editor: Editor
  title: string
  titleRef: RefObject<HTMLTextAreaElement | null>
  onTitleChange?: (title: string) => void
  mode: FindMode
  onModeChange: (mode: FindMode) => void
  onClose: () => void
}

type Scope = 'title' | 'document'

export function FindReplaceBar({
  editor,
  title,
  titleRef,
  onTitleChange,
  mode,
  onModeChange,
  onClose,
}: FindReplaceBarProps) {
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [includeTitle, setIncludeTitle] = useState(true)
  const [scope, setScope] = useState<Scope>('document')
  const [titleIndex, setTitleIndex] = useState(0)
  const [status, setStatus] = useState<SearchPluginState | undefined>(() =>
    getSearchState(editor.state),
  )
  const queryRef = useRef<HTMLInputElement>(null)

  const options = useMemo<ResolvedSearchOptions>(
    () => ({
      ...DEFAULT_SEARCH_OPTIONS,
      caseSensitive,
      wholeWord,
      regex: useRegex,
    }),
    [caseSensitive, wholeWord, useRegex],
  )

  const titleSearch = useMemo(() => {
    try {
      return {
        matches: findTextMatches(title, query, options),
        error: '',
      }
    } catch (error) {
      return { matches: [] as SearchMatch[], error: formatSearchError(error) }
    }
  }, [options, query, title])

  const titleMatches = includeTitle ? titleSearch.matches : []
  const titleCount = titleMatches.length
  const documentCount = status?.matches.length ?? 0
  const totalCount = titleCount + documentCount
  const documentCurrent = status?.current ?? 0
  const currentNumber =
    totalCount === 0
      ? 0
      : scope === 'title'
        ? Math.min(titleIndex, titleCount - 1) + 1
        : titleCount + documentCurrent + 1
  const error = titleSearch.error || status?.error || ''

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
    const hasTitleMatch = includeTitle && titleSearch.matches.length > 0
    editor.commands.setSearch(query, options, !hasTitleMatch)
    if (hasTitleMatch) {
      setScope('title')
      setTitleIndex(0)
    } else {
      setScope('document')
    }
  }, [
    editor,
    includeTitle,
    options,
    query,
    titleSearch.matches.length,
  ])

  useEffect(() => {
    if (scope === 'title' && titleIndex >= titleCount) {
      setTitleIndex(Math.max(0, titleCount - 1))
    }
  }, [scope, titleCount, titleIndex])

  useEffect(() => {
    if (scope !== 'title') return
    const input = titleRef.current
    const match = titleMatches[titleIndex]
    if (!input || !match) return
    if (document.activeElement === input) return
    input.setSelectionRange(match.from, match.to)
  }, [scope, titleIndex, titleMatches, titleRef])

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

  const focusTitle = (index: number, focus = false) => {
    setScope('title')
    setTitleIndex(index)
    const match = titleMatches[index]
    const input = titleRef.current
    if (!match || !input) return
    input.setSelectionRange(match.from, match.to)
    if (focus) input.focus()
  }

  const move = (direction: 1 | -1) => {
    if (totalCount === 0) return
    if (scope === 'title') {
      if (direction === 1) {
        if (titleIndex < titleCount - 1) {
          focusTitle(titleIndex + 1)
        } else if (documentCount > 0) {
          setScope('document')
          editor.commands.selectSearchMatch(0)
        } else {
          focusTitle(0)
        }
      } else if (titleIndex > 0) {
        focusTitle(titleIndex - 1)
      } else if (documentCount > 0) {
        setScope('document')
        editor.commands.selectSearchMatch(documentCount - 1)
      } else {
        focusTitle(titleCount - 1)
      }
      return
    }

    if (direction === 1) {
      if (documentCurrent < documentCount - 1) {
        editor.commands.searchNext(1)
      } else if (titleCount > 0) {
        focusTitle(0)
      } else {
        editor.commands.searchNext(1)
      }
    } else if (documentCurrent > 0) {
      editor.commands.searchNext(-1)
    } else if (titleCount > 0) {
      focusTitle(titleCount - 1)
    } else {
      editor.commands.searchNext(-1)
    }
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
    if (scope === 'title') {
      if (!onTitleChange) return
      const match = titleMatches[titleIndex]
      if (!match) return
      onTitleChange(
        title.slice(0, match.from) + replacement + title.slice(match.to),
      )
      return
    }
    editor.commands.replaceCurrentMatch(replacement)
  }

  const replaceAll = () => {
    if (includeTitle && onTitleChange && titleMatches.length > 0) {
      let next = title
      for (let index = titleMatches.length - 1; index >= 0; index -= 1) {
        const match = titleMatches[index]
        next = next.slice(0, match.from) + replacement + next.slice(match.to)
      }
      onTitleChange(next)
    }
    editor.commands.replaceAllMatches(replacement)
  }

  const titleMatch = scope === 'title' ? titleMatches[titleIndex] : null

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
          {query ? (error ? 'Invalid pattern' : totalCount ? `${currentNumber} of ${totalCount}` : 'No results') : ''}
        </span>
        <div className="find-bar__nav">
          <button
            type="button"
            className="find-bar__btn"
            aria-label="Previous match"
            disabled={!totalCount}
            onClick={() => move(-1)}
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            className="find-bar__btn"
            aria-label="Next match"
            disabled={!totalCount}
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

      <div className="find-bar__options" role="group" aria-label="Search options">
        <button
          type="button"
          className="find-bar__option"
          data-active={caseSensitive ? 'true' : 'false'}
          aria-pressed={caseSensitive}
          title="Match case"
          aria-label="Match case"
          onClick={() => setCaseSensitive((value) => !value)}
        >
          Aa
        </button>
        <button
          type="button"
          className="find-bar__option"
          data-active={wholeWord ? 'true' : 'false'}
          aria-pressed={wholeWord}
          title="Whole word"
          aria-label="Whole word"
          onClick={() => setWholeWord((value) => !value)}
        >
          <span className="find-bar__word">W</span>
        </button>
        <button
          type="button"
          className="find-bar__option"
          data-active={includeTitle ? 'true' : 'false'}
          aria-pressed={includeTitle}
          title="Include page title"
          aria-label="Include page title"
          onClick={() => setIncludeTitle((value) => !value)}
        >
          Title
        </button>
        <button
          type="button"
          className="find-bar__option"
          data-active={useRegex ? 'true' : 'false'}
          data-danger={useRegex ? 'true' : 'false'}
          aria-pressed={useRegex}
          title="Regular expression (can be slow)"
          aria-label="Use regular expression"
          onClick={() => setUseRegex((value) => !value)}
        >
          .*
        </button>
        {useRegex && (
          <span className="find-bar__unsafe">
            Regex is evaluated in-page; complex patterns can be slow.
          </span>
        )}
      </div>

      {error && <div className="find-bar__error">{error}</div>}

      {includeTitle && titleMatch && (
        <button
          type="button"
          className="find-bar__title-match"
          onClick={() => focusTitle(titleIndex, true)}
          title="Show title match"
        >
          <span className="find-bar__title-label">Title</span>
          <span className="find-bar__title-text">
            {title.slice(0, titleMatch.from)}
            <mark>{title.slice(titleMatch.from, titleMatch.to)}</mark>
            {title.slice(titleMatch.to)}
          </span>
        </button>
      )}

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
            disabled={!query || !totalCount}
            onClick={replaceOne}
          >
            Replace
          </button>
          <button
            type="button"
            className="find-bar__btn find-bar__btn--text"
            disabled={!query || !totalCount}
            onClick={replaceAll}
          >
            Replace all
          </button>
        </div>
      )}
    </div>,
  )
}
