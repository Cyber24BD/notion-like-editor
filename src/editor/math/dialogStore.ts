import { useSyncExternalStore } from 'react'
import type { MathDialogOptions } from './types'

interface MathDialogState {
  open: boolean
  options: MathDialogOptions | null
}

let state: MathDialogState = { open: false, options: null }
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function openMathDialog(options: MathDialogOptions) {
  state = { open: true, options }
  emit()
}

export function closeMathDialog() {
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

export function useMathDialog() {
  return useSyncExternalStore(subscribe, () => state, () => state)
}
