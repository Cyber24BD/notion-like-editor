export const EDITOR_FEATURES = [
  'codeBlock',
  'video',
  'audio',
  'iframe',
  'bookmark',
  'toc',
  'math',
  'mermaid',
  'chart',
  'customHtml',
] as const

export type EditorFeature = (typeof EDITOR_FEATURES)[number]
export type EditorFeatures = Partial<Record<EditorFeature, boolean>>
export type ResolvedEditorFeatures = Record<EditorFeature, boolean>

export const FULL_FEATURES: ResolvedEditorFeatures = {
  codeBlock: true,
  video: true,
  audio: true,
  iframe: true,
  bookmark: true,
  toc: true,
  math: true,
  mermaid: true,
  chart: true,
  customHtml: true,
}

export const STANDARD_FEATURES: ResolvedEditorFeatures = {
  ...FULL_FEATURES,
  audio: false,
  iframe: false,
  math: false,
  mermaid: false,
}

export const CORE_FEATURES: ResolvedEditorFeatures = {
  ...FULL_FEATURES,
  codeBlock: false,
  video: false,
  audio: false,
  iframe: false,
  bookmark: false,
  toc: false,
  math: false,
  mermaid: false,
  chart: false,
  customHtml: false,
}

export function resolveEditorFeatures(
  features?: EditorFeatures,
): ResolvedEditorFeatures {
  return { ...FULL_FEATURES, ...features }
}

export function featureKey(features?: EditorFeatures): string {
  const resolved = resolveEditorFeatures(features)
  return EDITOR_FEATURES.map((feature) => (resolved[feature] ? '1' : '0')).join(
    '',
  )
}
