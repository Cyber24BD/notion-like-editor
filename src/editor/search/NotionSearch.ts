import { Extension } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import {
  Plugin,
  PluginKey,
  TextSelection,
  type EditorState,
} from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface SearchMatch {
  from: number
  to: number
}

export interface SearchPluginState {
  query: string
  matches: SearchMatch[]
  current: number
  decorations: DecorationSet
}

type SearchMeta =
  | { type: 'set'; query: string; current?: number }
  | { type: 'clear' }

export const searchPluginKey = new PluginKey<SearchPluginState>('notionSearch')

function emptyState(): SearchPluginState {
  return {
    query: '',
    matches: [],
    current: 0,
    decorations: DecorationSet.empty,
  }
}

function findMatches(doc: ProseMirrorNode, query: string): SearchMatch[] {
  if (!query) return []
  const needle = query.toLocaleLowerCase()
  const matches: SearchMatch[] = []

  doc.descendants((node, position) => {
    if (!node.isText || !node.text) return
    const haystack = node.text.toLocaleLowerCase()
    let cursor = 0
    while (cursor <= haystack.length - needle.length) {
      const index = haystack.indexOf(needle, cursor)
      if (index === -1) break
      matches.push({
        from: position + index,
        to: position + index + query.length,
      })
      cursor = index + Math.max(1, query.length)
    }
  })

  return matches
}

function buildState(
  doc: ProseMirrorNode,
  query: string,
  current: number,
): SearchPluginState {
  if (!query) return emptyState()
  const matches = findMatches(doc, query)
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
  return { query, matches, current: nextCurrent, decorations }
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
      setSearch: (query: string) => ReturnType
      searchNext: (direction?: 1 | -1) => ReturnType
      clearSearch: () => ReturnType
      replaceCurrentMatch: (replacement: string) => ReturnType
      replaceAllMatches: (replacement: string) => ReturnType
    }
  }
}

/**
 * Literal, case-insensitive in-page search with persistent match decorations.
 * The UI lives in FindReplaceBar; this extension only owns ProseMirror state so
 * the matches stay correct while the document is edited.
 */
export const NotionSearch = Extension.create({
  name: 'notionSearch',

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchPluginState>({
        key: searchPluginKey,
        state: {
          init: emptyState,
          apply(transaction, previous) {
            const meta = transaction.getMeta(searchPluginKey) as
              | SearchMeta
              | undefined
            if (meta?.type === 'clear') return emptyState()
            if (!meta && !transaction.docChanged) return previous
            return buildState(
              transaction.doc,
              meta?.type === 'set' ? meta.query : previous.query,
              meta?.type === 'set' ? (meta.current ?? 0) : previous.current,
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
        (query) =>
        ({ state, dispatch }) => {
          if (!dispatch) return true
          const next = buildState(state.doc, query, 0)
          let transaction = state.tr.setMeta(searchPluginKey, {
            type: 'set',
            query,
            current: 0,
          })
          const match = next.matches[next.current]
          if (match) transaction = selectMatch(state, match)
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
          dispatch(state.tr.setMeta(searchPluginKey, { type: 'clear' }))
          return true
        },

      replaceCurrentMatch:
        (replacement) =>
        ({ state, dispatch }) => {
          const previous = searchPluginKey.getState(state)
          const match = previous?.matches[previous.current]
          if (!dispatch || !previous || !match) return false
          let transaction = state.tr.insertText(
            replacement,
            match.from,
            match.to,
          )
          const next = buildState(
            transaction.doc,
            previous.query,
            previous.current,
          )
          transaction = transaction.setMeta(searchPluginKey, {
            type: 'set',
            query: previous.query,
            current: next.current,
          })
          const selected = next.matches[next.current]
          if (selected) {
            transaction = transaction
              .setSelection(
                TextSelection.create(
                  transaction.doc,
                  selected.from,
                  selected.to,
                ),
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
