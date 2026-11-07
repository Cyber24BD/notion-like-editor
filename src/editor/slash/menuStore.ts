import type { SlashItem } from './types'

export interface SlashMenuState {
  open: boolean
  mode: 'suggestion' | 'insert'
  items: SlashItem[]
  index: number
  query: string
  rect: DOMRect | null
  getRect: (() => DOMRect | null) | null
  onSelect: ((item: SlashItem) => void) | null
}

const initialState: SlashMenuState = {
  open: false,
  mode: 'suggestion',
  items: [],
  index: 0,
  query: '',
  rect: null,
  getRect: null,
  onSelect: null,
}

let state: SlashMenuState = initialState
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function set(patch: Partial<SlashMenuState>) {
  state = { ...state, ...patch }
  emit()
}

export const slashMenu = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  getSnapshot() {
    return state
  },

  open(options: {
    items: SlashItem[]
    rect: DOMRect | null
    getRect?: (() => DOMRect | null) | null
    query?: string
    mode?: 'suggestion' | 'insert'
    onSelect: (item: SlashItem) => void
  }) {
    set({
      open: true,
      mode: options.mode ?? 'suggestion',
      items: options.items,
      index: 0,
      query: options.query ?? '',
      rect: options.rect,
      getRect: options.getRect ?? null,
      onSelect: options.onSelect,
    })
  },

  update(patch: {
    items?: SlashItem[]
    rect?: DOMRect | null
    query?: string
    onSelect?: (item: SlashItem) => void
  }) {
    set({ ...patch, index: 0 })
  },

  close() {
    if (!state.open) return
    state = initialState
    emit()
  },

  setIndex(index: number) {
    const max = state.items.length - 1
    set({ index: Math.max(0, Math.min(max, index)) })
  },

  move(delta: number) {
    if (state.items.length === 0) return
    const next = (state.index + delta + state.items.length) % state.items.length
    set({ index: next })
  },

  selectActive() {
    const item = state.items[state.index]
    if (item) state.onSelect?.(item)
  },

  selectByIndex(index: number) {
    const item = state.items[index]
    if (item) {
      set({ index })
      state.onSelect?.(item)
    }
  },
}
