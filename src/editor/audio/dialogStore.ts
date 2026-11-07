import { useSyncExternalStore } from 'react'
import type { Editor } from '@tiptap/core'

interface AudioDialogState {
  open: boolean
  editor: Editor | null
}

let state: AudioDialogState = { open: false, editor: null }
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function openAudioDialog(editor: Editor) {
  state = { open: true, editor }
  emit()
}

export function closeAudioDialog() {
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

export function useAudioDialog() {
  return useSyncExternalStore(subscribe, () => state, () => state)
}
