import { lazy, Suspense, type ComponentProps } from 'react'
import type { AudioDialog } from '../AudioDialog'
import type { BookmarkDialog } from '../BookmarkDialog'
import type { ChartSettingsDialog } from '../ChartSettingsDialog'
import type { ColorPalette } from '../ColorPalette'
import type { CommandPalette } from '../CommandPalette'
import type { CropDialog } from '../nodes/CropDialog'
import type { EmojiPicker } from '../EmojiPicker'
import type { IframeDialog } from '../IframeDialog'
import type { MathDialog } from '../MathDialog'
import type { MermaidDialog } from '../MermaidDialog'
import type { VideoDialog } from '../VideoDialog'
import type { ResolvedEditorFeatures } from '../../editor/features'

type AudioDialogProps = ComponentProps<typeof AudioDialog>
type BookmarkDialogProps = ComponentProps<typeof BookmarkDialog>
type ChartSettingsProps = ComponentProps<typeof ChartSettingsDialog>
type ColorPaletteProps = ComponentProps<typeof ColorPalette>
type CommandPaletteProps = ComponentProps<typeof CommandPalette>
type CropDialogProps = ComponentProps<typeof CropDialog>
type EmojiPickerProps = ComponentProps<typeof EmojiPicker>
type IframeDialogProps = ComponentProps<typeof IframeDialog>
type MathDialogProps = ComponentProps<typeof MathDialog>
type MermaidDialogProps = ComponentProps<typeof MermaidDialog>
type VideoDialogProps = ComponentProps<typeof VideoDialog>

const AudioDialogLazy = lazy(() =>
  import('../AudioDialog').then((module) => ({ default: module.AudioDialog })),
)
const BookmarkDialogLazy = lazy(() =>
  import('../BookmarkDialog').then((module) => ({
    default: module.BookmarkDialog,
  })),
)
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
const MathDialogLazy = lazy(() =>
  import('../MathDialog').then((module) => ({ default: module.MathDialog })),
)
const MermaidDialogLazy = lazy(() =>
  import('../MermaidDialog').then((module) => ({
    default: module.MermaidDialog,
  })),
)
const VideoDialogLazy = lazy(() =>
  import('../VideoDialog').then((module) => ({ default: module.VideoDialog })),
)

export function LazyAudioDialog(props: AudioDialogProps) {
  return (
    <Suspense fallback={null}>
      <AudioDialogLazy {...props} />
    </Suspense>
  )
}

export function LazyBookmarkDialog(props: BookmarkDialogProps) {
  return (
    <Suspense fallback={null}>
      <BookmarkDialogLazy {...props} />
    </Suspense>
  )
}

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

export function LazyMermaidDialog(props: MermaidDialogProps) {
  return (
    <Suspense fallback={null}>
      <MermaidDialogLazy {...props} />
    </Suspense>
  )
}

export function LazyMathDialog(props: MathDialogProps) {
  return (
    <Suspense fallback={null}>
      <MathDialogLazy {...props} />
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
 * stays smaller. Feature-gated dialogs are only preloaded when the mounted
 * preset can actually open them; core/standard must never download Mermaid or
 * KaTeX after mount.
 */
export function preloadFeatureDialogs(features: ResolvedEditorFeatures) {
  void import('../ColorPalette')
  void import('../nodes/CropDialog')
  void import('../EmojiPicker')
  if (features.chart) void import('../ChartSettingsDialog')
  if (features.video) void import('../VideoDialog')
  if (features.audio) void import('../AudioDialog')
  if (features.iframe) void import('../IframeDialog')
  if (features.bookmark) void import('../BookmarkDialog')
  if (features.math) void import('../MathDialog')
  if (features.mermaid) void import('../MermaidDialog')
}
