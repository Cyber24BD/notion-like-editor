export type ChartKind = 'bar' | 'line' | 'area' | 'pie' | 'donut'
export type ChartPalette = 'notion' | 'ocean' | 'sunset' | 'forest' | 'mono'

export interface ChartSeries {
  name: string
  values: number[]
}

export interface ChartData {
  kind: ChartKind
  title: string
  labels: string[]
  series: ChartSeries[]
  palette: ChartPalette
  showLegend: boolean
  showGrid: boolean
  showValues: boolean
  stacked: boolean
  height: number
  suffix: string
}

export const CHART_KINDS: { value: ChartKind; label: string }[] = [
  { value: 'bar', label: 'Bar' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'pie', label: 'Pie' },
  { value: 'donut', label: 'Donut' },
]

export const PALETTES: Record<ChartPalette, string[]> = {
  notion: ['#2383e2', '#4dab9a', '#f2994a', '#9065b0', '#eb5757', '#cb912f'],
  ocean: ['#0b6bcb', '#2f9e9e', '#5b8def', '#62c3cf', '#1c3f94', '#7cc6d6'],
  sunset: ['#e8590c', '#f08c00', '#c2255c', '#e64980', '#ffa94d', '#b23a48'],
  forest: ['#2b8a3e', '#5c940d', '#0ca678', '#74b816', '#087f5b', '#9bbf30'],
  mono: ['#7c7b77', '#a3a29d', '#5e5d59', '#c2c1bc', '#8f8e89', '#6b6a66'],
}

export const PALETTE_OPTIONS: { value: ChartPalette; label: string }[] = [
  { value: 'notion', label: 'Notion' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'sunset', label: 'Sunset' },
  { value: 'forest', label: 'Forest' },
  { value: 'mono', label: 'Mono' },
]

const KINDS = new Set<ChartKind>(CHART_KINDS.map((kind) => kind.value))
const PALETTE_KEYS = new Set<ChartPalette>(
  PALETTE_OPTIONS.map((palette) => palette.value),
)

export function defaultChart(): ChartData {
  return {
    kind: 'bar',
    title: 'Quarterly revenue',
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    series: [{ name: 'Revenue', values: [42, 68, 55, 82] }],
    palette: 'notion',
    showLegend: true,
    showGrid: true,
    showValues: false,
    stacked: false,
    height: 280,
    suffix: '',
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export function normalizeChart(value: unknown): ChartData {
  const base = defaultChart()
  if (!isRecord(value)) return base

  const kind = KINDS.has(value.kind as ChartKind) ? (value.kind as ChartKind) : base.kind
  const palette = PALETTE_KEYS.has(value.palette as ChartPalette)
    ? (value.palette as ChartPalette)
    : base.palette

  const labels = Array.isArray(value.labels)
    ? value.labels
        .filter((label): label is string => typeof label === 'string')
        .map((label) => label.trim() || '—')
        .slice(0, 16)
    : base.labels

  const series = Array.isArray(value.series)
    ? value.series
        .filter(
          (entry): entry is { name?: unknown; values?: unknown } => isRecord(entry),
        )
        .slice(0, 4)
        .map((entry, index) => ({
          name:
            typeof entry.name === 'string' && entry.name.trim()
              ? entry.name.trim()
              : `Series ${index + 1}`,
          values: labels.map((_, labelIndex) => {
            const raw = Array.isArray(entry.values) ? entry.values[labelIndex] : 0
            const number = Number(raw)
            return Number.isFinite(number) ? Math.max(0, number) : 0
          }),
        }))
    : base.series

  const safeLabels = labels.length > 0 ? labels : base.labels
  const safeSeries =
    series.length > 0
      ? series.map((entry) => ({
          ...entry,
          values: safeLabels.map((_, index) => entry.values[index] ?? 0),
        }))
      : base.series.map((entry) => ({
          ...entry,
          values: safeLabels.map((_, index) => entry.values[index] ?? 0),
        }))

  return {
    kind,
    title: typeof value.title === 'string' ? value.title : base.title,
    labels: safeLabels,
    series: safeSeries,
    palette,
    showLegend: typeof value.showLegend === 'boolean' ? value.showLegend : base.showLegend,
    showGrid: typeof value.showGrid === 'boolean' ? value.showGrid : base.showGrid,
    showValues: typeof value.showValues === 'boolean' ? value.showValues : base.showValues,
    stacked: typeof value.stacked === 'boolean' ? value.stacked : base.stacked,
    height:
      typeof value.height === 'number' && Number.isFinite(value.height)
        ? Math.min(420, Math.max(180, Math.round(value.height)))
        : base.height,
    suffix: typeof value.suffix === 'string' ? value.suffix.slice(0, 8) : base.suffix,
  }
}

export function formatChartValue(value: number, suffix: string): string {
  const rounded = Math.round(value * 100) / 100
  const text = Number.isInteger(rounded)
    ? rounded.toLocaleString()
    : rounded.toFixed(2).replace(/\.?0+$/, '')
  return `${text}${suffix}`
}

export function niceMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1
  const exponent = Math.floor(Math.log10(value))
  const magnitude = 10 ** exponent
  const fraction = value / magnitude
  const nice =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10
  return nice * magnitude
}

export function truncateLabel(label: string, max = 13): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label
}

export function isLightColor(hex: string): boolean {
  const value = hex.replace('#', '')
  if (value.length !== 6) return false
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}
