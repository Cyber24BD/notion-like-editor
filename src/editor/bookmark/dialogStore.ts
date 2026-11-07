import { useSyncExternalStore } from 'react'
import type { Editor } from '@tiptap/core'

interface BookmarkDialogState {
  open: boolean
  editor: Editor | null
}

let state: BookmarkDialogState = { open: false, editor: null }
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function openBookmarkDialog(editor: Editor) {
  state = { open: true, editor }
  emit()
}

export function closeBookmarkDialog() {
  if (!state.open) return
  state = { open: false, editor: null }
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useBookmarkDialog() {
  return useSyncExternalStore(subscribe, () => state, () => state)
}
