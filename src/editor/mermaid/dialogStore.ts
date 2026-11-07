import { useSyncExternalStore } from 'react'
import type { Editor } from '@tiptap/core'

export interface MermaidDialogOptions {
  editor: Editor
  initialCode: string
  initialTheme: string
  initialHeight: number
  onApply: (code: string, theme: string, height: number) => void
}

interface MermaidDialogState {
  open: boolean
  options: MermaidDialogOptions | null
}

let state: MermaidDialogState = { open: false, options: null }
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function openMermaidDialog(options: MermaidDialogOptions) {
  state = { open: true, options }
  emit()
}

export function closeMermaidDialog() {
  if (!state.open) return
  state = { open: false, options: null }
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useMermaidDialog() {
  return useSyncExternalStore(subscribe, () => state, () => state)
}
