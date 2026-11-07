import { useSyncExternalStore } from 'react'
import type { Editor } from '@tiptap/core'

interface IframeDialogState {
  open: boolean
  editor: Editor | null
}

let state: IframeDialogState = { open: false, editor: null }
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function openIframeDialog(editor: Editor) {
  state = { open: true, editor }
  emit()
}

export function closeIframeDialog() {
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

export function useIframeDialog() {
  return useSyncExternalStore(subscribe, () => state, () => state)
}
