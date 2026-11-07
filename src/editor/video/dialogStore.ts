import { useSyncExternalStore } from 'react'
import type { Editor } from '@tiptap/core'

interface VideoDialogState {
  open: boolean
  editor: Editor | null
}

let state: VideoDialogState = { open: false, editor: null }
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function openVideoDialog(editor: Editor) {
  state = { open: true, editor }
  emit()
}

export function closeVideoDialog() {
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

export function useVideoDialog() {
  return useSyncExternalStore(subscribe, () => state, () => state)
}
