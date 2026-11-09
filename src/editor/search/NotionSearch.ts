import { Extension } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import {
  Plugin,
  PluginKey,
  TextSelection,
  type EditorState,
} from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface SearchOptions {
  caseSensitive?: boolean
  wholeWord?: boolean
  regex?: boolean
}

export type ResolvedSearchOptions = Required<SearchOptions>

export const DEFAULT_SEARCH_OPTIONS: ResolvedSearchOptions = {
  caseSensitive: false,
  wholeWord: false,
  regex: false,
}

export interface SearchMatch {
  from: number
  to: number
}

export interface SearchPluginState {
  query: string
  options: ResolvedSearchOptions
  matches: SearchMatch[]
  current: number
  decorations: DecorationSet
  error: string
}

type SearchMeta =
  | {
      type: 'set'
      query: string
      options: ResolvedSearchOptions
      current?: number
    }
  | { type: 'clear' }

export const searchPluginKey = new PluginKey<SearchPluginState>('notionSearch')

function normalizeOptions(options?: SearchOptions): ResolvedSearchOptions {
  return { ...DEFAULT_SEARCH_OPTIONS, ...options }
}

function escapeRegExp(value: string): string {
  const special = new Set<string>(['\\', '^', '$', '.', '*', '+', '?', '(', ')', '[', ']', '{', '}', '|'])
  return [...value].map((character) => (special.has(character) ? '\\' + character : character)).join('')
}

export function formatSearchError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message.replace(/^Invalid regular expression:\s*/i, '')
  }
  return 'Invalid regular expression.'
}

/**
 * Finds literal or regex matches in a single string. Throws for an invalid
 * regular expression so callers can show a clear inline error.
 */
export function findTextMatches(
  text: string,
  query: string,
  options?: SearchOptions,
): SearchMatch[] {
  if (!text || !query) return []
  const resolved = normalizeOptions(options)
  const flags = resolved.caseSensitive ? 'g' : 'gi'
  let source = resolved.regex ? query : escapeRegExp(query)
  if (resolved.wholeWord) {
    source = `(?<!\\w)(?:${source})(?!\\w)`
  }

  const regex = new RegExp(source, flags)
  const matches: SearchMatch[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(text))) {
    if (match[0].length === 0) {
      // Avoid an infinite loop for zero-width patterns.
      regex.lastIndex += 1
      continue
    }
    matches.push({ from: match.index, to: match.index + match[0].length })
    if (regex.lastIndex === match.index) regex.lastIndex += 1
  }
  return matches
}

function findDocumentMatches(
  doc: ProseMirrorNode,
  query: string,
  options: SearchOptions,
): SearchMatch[] {
  const matches: SearchMatch[] = []
  doc.descendants((node, position) => {
    if (!node.isText || !node.text) return
    for (const match of findTextMatches(node.text, query, options)) {
      matches.push({
        from: position + match.from,
        to: position + match.to,
      })
    }
  })
  return matches
}

function emptyState(
  options: ResolvedSearchOptions = DEFAULT_SEARCH_OPTIONS,
): SearchPluginState {
  return {
    query: '',
    options,
    matches: [],
    current: 0,
    decorations: DecorationSet.empty,
    error: '',
  }
}

function buildState(
  doc: ProseMirrorNode,
  query: string,
  options: SearchOptions,
  current: number,
): SearchPluginState {
  const resolved = normalizeOptions(options)
  if (!query) return emptyState(resolved)

  let matches: SearchMatch[]
  try {
    matches = findDocumentMatches(doc, query, resolved)
  } catch (error) {
    return {
      ...emptyState(resolved),
      query,
      error: formatSearchError(error),
    }
  }

  const nextCurrent =
    matches.length === 0 ? 0 : Math.min(Math.max(0, current), matches.length - 1)
  const decorations = DecorationSet.create(
    doc,
    matches.map((match, index) =>
      Decoration.inline(match.from, match.to, {
        class:
          index === nextCurrent
            ? 'search-match search-match--current'
            : 'search-match',
      }),
    ),
  )
  return {
    query,
    options: resolved,
    matches,
    current: nextCurrent,
    decorations,
    error: '',
  }
}

function selectMatch(
  state: EditorState,
  match: SearchMatch,
): EditorState['tr'] {
  return state.tr
    .setSelection(TextSelection.create(state.doc, match.from, match.to))
    .scrollIntoView()
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    notionSearch: {
      setSearch: (
        query: string,
        options?: SearchOptions,
        selectFirst?: boolean,
      ) => ReturnType
      searchNext: (direction?: 1 | -1) => ReturnType
      selectSearchMatch: (index: number) => ReturnType
      clearSearch: () => ReturnType
      replaceCurrentMatch: (replacement: string) => ReturnType
      replaceAllMatches: (replacement: string) => ReturnType
    }
  }
}

/**
 * Literal/regex, case-aware in-page search with persistent match decorations.
 * The UI lives in FindReplaceBar; this extension owns only document state.
 */
export const NotionSearch = Extension.create({
  name: 'notionSearch',

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchPluginState>({
        key: searchPluginKey,
        state: {
          init: () => emptyState(),
          apply(transaction, previous) {
            const meta = transaction.getMeta(searchPluginKey) as
              | SearchMeta
              | undefined
            if (meta?.type === 'clear') return emptyState(previous.options)
            if (!meta && !transaction.docChanged) return previous
            return buildState(
              transaction.doc,
              meta?.type === 'set' ? meta.query : previous.query,
              meta?.type === 'set' ? meta.options : previous.options,
              meta?.type === 'set'
                ? (meta.current ?? 0)
                : previous.current,
            )
          },
        },
        props: {
          decorations(state) {
            return searchPluginKey.getState(state)?.decorations ?? null
          },
        },
      }),
    ]
  },

  addCommands() {
    return {
      setSearch:
        (query, options, selectFirst = true) =>
        ({ state, dispatch }) => {
          if (!dispatch) return true
          const resolved = normalizeOptions(options)
          const next = buildState(state.doc, query, resolved, 0)
          let transaction = state.tr.setMeta(searchPluginKey, {
            type: 'set',
            query,
            options: resolved,
            current: 0,
          })
          const match = next.matches[next.current]
          if (selectFirst && match) {
            transaction = selectMatch(state, match)
          }
          dispatch(transaction)
          return true
        },

      searchNext:
        (direction = 1) =>
        ({ state, dispatch }) => {
          const previous = searchPluginKey.getState(state)
          if (!dispatch || !previous?.matches.length) return false
          const current =
            (previous.current + direction + previous.matches.length) %
            previous.matches.length
          const match = previous.matches[current]
          const transaction = selectMatch(state, match).setMeta(
            searchPluginKey,
            {
              type: 'set',
              query: previous.query,
              options: previous.options,
              current,
            },
          )
          dispatch(transaction)
          return true
        },

      selectSearchMatch:
        (index) =>
        ({ state, dispatch }) => {
          const previous = searchPluginKey.getState(state)
          if (!dispatch || !previous?.matches.length) return false
          const current = Math.max(
            0,
            Math.min(index, previous.matches.length - 1),
          )
          const match = previous.matches[current]
          const transaction = selectMatch(state, match).setMeta(
            searchPluginKey,
            {
              type: 'set',
              query: previous.query,
              options: previous.options,
              current,
            },
          )
          dispatch(transaction)
          return true
        },

      clearSearch:
        () =>
        ({ state, dispatch }) => {
          if (!dispatch) return true
          dispatch(
            state.tr.setMeta(searchPluginKey, {
              type: 'clear',
            }),
          )
          return true
        },

      replaceCurrentMatch:
        (replacement) =>
        ({ state, dispatch }) => {
          const previous = searchPluginKey.getState(state)
          const match = previous?.matches[previous.current]
          if (!dispatch || !previous || !match) return false
          let transaction = state.tr.insertText(replacement, match.from, match.to)
          const next = buildState(
            transaction.doc,
            previous.query,
            previous.options,
            previous.current,
          )
          transaction = transaction.setMeta(searchPluginKey, {
            type: 'set',
            query: previous.query,
            options: previous.options,
            current: next.current,
          })
          const selected = next.matches[next.current]
          if (selected) {
            transaction = transaction
              .setSelection(
                TextSelection.create(transaction.doc, selected.from, selected.to),
              )
              .scrollIntoView()
          }
          dispatch(transaction)
          return true
        },

      replaceAllMatches:
        (replacement) =>
        ({ state, dispatch }) => {
          const previous = searchPluginKey.getState(state)
          if (!dispatch || !previous?.matches.length) return false
          let transaction = state.tr
          for (let index = previous.matches.length - 1; index >= 0; index -= 1) {
            const match = previous.matches[index]
            transaction = transaction.insertText(replacement, match.from, match.to)
          }
          transaction = transaction.setMeta(searchPluginKey, {
            type: 'set',
            query: previous.query,
            options: previous.options,
            current: 0,
          })
          dispatch(transaction)
          return true
        },
    }
  },
})

export function getSearchState(
  state: EditorState,
): SearchPluginState | undefined {
  return searchPluginKey.getState(state)
}
