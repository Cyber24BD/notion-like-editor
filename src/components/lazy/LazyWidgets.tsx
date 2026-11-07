import { lazy, Suspense, type ComponentProps } from 'react'
import type { ChartSettingsDialog } from '../ChartSettingsDialog'
import type { ColorPalette } from '../ColorPalette'
import type { CommandPalette } from '../CommandPalette'
import type { CropDialog } from '../nodes/CropDialog'
import type { EmojiPicker } from '../EmojiPicker'
import type { IframeDialog } from '../IframeDialog'
import type { VideoDialog } from '../VideoDialog'

type ChartSettingsProps = ComponentProps<typeof ChartSettingsDialog>
type ColorPaletteProps = ComponentProps<typeof ColorPalette>
type CommandPaletteProps = ComponentProps<typeof CommandPalette>
type CropDialogProps = ComponentProps<typeof CropDialog>
type EmojiPickerProps = ComponentProps<typeof EmojiPicker>
type IframeDialogProps = ComponentProps<typeof IframeDialog>
type VideoDialogProps = ComponentProps<typeof VideoDialog>

const ChartSettingsLazy = lazy(() =>
  import('../ChartSettingsDialog').then((module) => ({
    default: module.ChartSettingsDialog,
  })),
)
const ColorPaletteLazy = lazy(() =>
  import('../ColorPalette').then((module) => ({ default: module.ColorPalette })),
)
const CommandPaletteLazy = lazy(() =>
  import('../CommandPalette').then((module) => ({ default: module.CommandPalette })),
)
const CropDialogLazy = lazy(() =>
  import('../nodes/CropDialog').then((module) => ({ default: module.CropDialog })),
)
const EmojiPickerLazy = lazy(() =>
  import('../EmojiPicker').then((module) => ({ default: module.EmojiPicker })),
)
const IframeDialogLazy = lazy(() =>
  import('../IframeDialog').then((module) => ({ default: module.IframeDialog })),
)
const VideoDialogLazy = lazy(() =>
  import('../VideoDialog').then((module) => ({ default: module.VideoDialog })),
)

export function LazyChartSettingsDialog(props: ChartSettingsProps) {
  return (
    <Suspense fallback={null}>
      <ChartSettingsLazy {...props} />
    </Suspense>
  )
}

export function LazyColorPalette(props: ColorPaletteProps) {
  return (
    <Suspense fallback={null}>
      <ColorPaletteLazy {...props} />
    </Suspense>
  )
}

export function LazyCommandPalette(props: CommandPaletteProps) {
  return (
    <Suspense fallback={null}>
      <CommandPaletteLazy {...props} />
    </Suspense>
  )
}

export function LazyCropDialog(props: CropDialogProps) {
  return (
    <Suspense fallback={null}>
      <CropDialogLazy {...props} />
    </Suspense>
  )
}

export function LazyEmojiPicker(props: EmojiPickerProps) {
  return (
    <Suspense fallback={null}>
      <EmojiPickerLazy {...props} />
    </Suspense>
  )
}

export function LazyIframeDialog(props: IframeDialogProps) {
  return (
    <Suspense fallback={null}>
      <IframeDialogLazy {...props} />
    </Suspense>
  )
}

export function LazyVideoDialog(props: VideoDialogProps) {
  return (
    <Suspense fallback={null}>
      <VideoDialogLazy {...props} />
    </Suspense>
  )
}

/**
 * Pull the interaction-only overlays into the browser cache after the editor
 * has settled, so opening them has no visible delay while the initial bundle
 * stays smaller.
 */
export function preloadFeatureDialogs() {
  void import('../ChartSettingsDialog')
  void import('../ColorPalette')
  void import('../nodes/CropDialog')
  void import('../EmojiPicker')
  void import('../IframeDialog')
  void import('../VideoDialog')
}
