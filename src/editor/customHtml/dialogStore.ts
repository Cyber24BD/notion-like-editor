import { useSyncExternalStore } from 'react'
import type { CustomHtmlSandboxOptions } from './document'

export interface CustomHtmlDialogOptions {
  editing?: boolean
  initialHtml: string
  initialCss: string
  initialJavascript: string
  initialOptions: CustomHtmlSandboxOptions
  onApply: (
    html: string,
    css: string,
    javascript: string,
    options: CustomHtmlSandboxOptions,
  ) => void
}

interface CustomHtmlDialogState {
  open: boolean
  options: CustomHtmlDialogOptions | null
}

let state: CustomHtmlDialogState = { open: false, options: null }
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function openCustomHtmlDialog(options: CustomHtmlDialogOptions) {
  state = { open: true, options }
  emit()
}

export function closeCustomHtmlDialog() {
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

export function useCustomHtmlDialog() {
  return useSyncExternalStore(subscribe, () => state, () => state)
}
