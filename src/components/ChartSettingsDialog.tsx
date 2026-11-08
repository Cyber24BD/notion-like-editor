import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createNotionPortal } from './NotionPortal'
import { ChartSvg } from './ChartSvg'
import {
  CHART_KINDS,
  PALETTES,
  PALETTE_OPTIONS,
  normalizeChart,
  type ChartData,
  type ChartKind,
  type ChartPalette,
} from '../editor/chart/types'
import {
  ChartArea,
  ChartBar,
  ChartDonut,
  ChartLine,
  ChartPie,
  Plus,
  Trash,
  X,
} from './Icons'

const KIND_ICONS: Record<ChartKind, ReactNode> = {
  bar: <ChartBar size={15} />,
  line: <ChartLine size={15} />,
  area: <ChartArea size={15} />,
  pie: <ChartPie size={15} />,
  donut: <ChartDonut size={15} />,
}

const HEIGHTS = [
  { value: 220, label: 'Compact' },
  { value: 280, label: 'Regular' },
  { value: 360, label: 'Tall' },
]

const clone = (data: ChartData): ChartData =>
  normalizeChart(JSON.parse(JSON.stringify(data)))

interface ChartSettingsDialogProps {
  initial: ChartData
  onApply: (data: ChartData) => void
  onClose: () => void
}

export function ChartSettingsDialog({
  initial,
  onApply,
  onClose,
}: ChartSettingsDialogProps) {
  const [draft, setDraft] = useState<ChartData>(() => clone(initial))
  const isPie = draft.kind === 'pie' || draft.kind === 'donut'
  const visibleSeries = isPie ? draft.series.slice(0, 1) : draft.series

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const previewChart = useMemo(
    () => ({ ...draft, height: Math.min(draft.height, 280) }),
    [draft],
  )

  const patch = (partial: Partial<ChartData>) =>
    setDraft((current) => ({ ...current, ...partial }))

  const setKind = (kind: ChartKind) => patch({ kind })

  const setLabel = (index: number, value: string) =>
    setDraft((current) => {
      const labels = current.labels.map((label, i) => (i === index ? value : label))
      return { ...current, labels }
    })

  const setSeriesName = (index: number, value: string) =>
    setDraft((current) => ({
      ...current,
      series: current.series.map((series, i) =>
        i === index ? { ...series, name: value } : series,
      ),
    }))

  const setValue = (seriesIndex: number, rowIndex: number, raw: string) => {
    const value = Math.max(0, Number(raw) || 0)
    setDraft((current) => ({
      ...current,
      series: current.series.map((series, i) =>
        i === seriesIndex
          ? {
              ...series,
              values: series.values.map((currentValue, j) =>
                j === rowIndex ? value : currentValue,
              ),
            }
          : series,
      ),
    }))
  }

  const addRow = () =>
    setDraft((current) => ({
      ...current,
      labels: [...current.labels, `Category ${current.labels.length + 1}`],
      series: current.series.map((series) => ({
        ...series,
        values: [...series.values, 0],
      })),
    }))

  const removeRow = (index: number) =>
    setDraft((current) => {
      if (current.labels.length <= 2) return current
      return {
        ...current,
        labels: current.labels.filter((_, i) => i !== index),
        series: current.series.map((series) => ({
          ...series,
          values: series.values.filter((_, i) => i !== index),
        })),
      }
    })

  const addSeries = () =>
    setDraft((current) => {
      if (current.series.length >= 4) return current
      return {
        ...current,
        series: [
          ...current.series,
          {
            name: `Series ${current.series.length + 1}`,
            values: current.labels.map(() => 0),
          },
        ],
      }
    })

  const removeSeries = (index: number) =>
    setDraft((current) => {
      if (current.series.length <= 1) return current
      return {
        ...current,
        series: current.series.filter((_, i) => i !== index),
      }
    })

  const canApply = draft.labels.length > 0 && draft.series.length > 0

  const submit = () => {
    if (!canApply) return
    onApply(normalizeChart(draft))
    onClose()
  }

  return createNotionPortal(
    <div
      className="chart-dialog-scrim"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="chart-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Chart settings"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="chart-dialog__head">
          <div>
            <div className="chart-dialog__title">Chart settings</div>
            <div className="chart-dialog__subtitle">
              Edit the data, pick a chart type, and tune the presentation.
            </div>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close chart settings"
            onClick={onClose}
          >
            <X size={15} />
          </button>
        </header>

        <div className="chart-dialog__body">
          <div className="chart-dialog__preview">
            <ChartSvg chart={previewChart} />
          </div>

          <div className="chart-dialog__settings">
          <div className="chart-field">
            <label className="chart-field__label" htmlFor="chart-title-input">
              Title
            </label>
            <input
              id="chart-title-input"
              className="chart-input"
              value={draft.title}
              placeholder="Chart title"
              onChange={(event) => patch({ title: event.target.value })}
            />
          </div>
          <div className="chart-field">
            <label className="chart-field__label" htmlFor="chart-suffix-input">
              Value suffix
            </label>
            <input
              id="chart-suffix-input"
              className="chart-input"
              value={draft.suffix}
              placeholder="e.g. % or k"
              onChange={(event) => patch({ suffix: event.target.value })}
            />
          </div>

          <div className="chart-field chart-field--wide">
            <span className="chart-field__label">Chart type</span>
            <div className="chart-kinds" role="group" aria-label="Chart type">
              {CHART_KINDS.map((kind) => (
                <button
                  key={kind.value}
                  type="button"
                  className="chart-chip"
                  data-active={draft.kind === kind.value ? 'true' : 'false'}
                  aria-pressed={draft.kind === kind.value}
                  onClick={() => setKind(kind.value)}
                >
                  {KIND_ICONS[kind.value]}
                  {kind.label}
                </button>
              ))}
            </div>
          </div>

          <div className="chart-field chart-field--wide">
            <span className="chart-field__label">Palette</span>
            <div className="chart-palettes" role="group" aria-label="Palette">
              {PALETTE_OPTIONS.map((palette) => (
                <button
                  key={palette.value}
                  type="button"
                  className="chart-palette"
                  data-active={draft.palette === palette.value ? 'true' : 'false'}
                  aria-pressed={draft.palette === palette.value}
                  onClick={() => patch({ palette: palette.value as ChartPalette })}
                >
                  <span className="chart-palette__dots" aria-hidden="true">
                    {PALETTES[palette.value].slice(0, 4).map((color) => (
                      <span key={color} style={{ background: color }} />
                    ))}
                  </span>
                  {palette.label}
                </button>
              ))}
            </div>
          </div>

          <div className="chart-field chart-field--wide">
            <span className="chart-field__label">Height</span>
            <div className="chart-chips" role="group" aria-label="Chart height">
              {HEIGHTS.map((height) => (
                <button
                  key={height.value}
                  type="button"
                  className="chart-chip"
                  data-active={draft.height === height.value ? 'true' : 'false'}
                  aria-pressed={draft.height === height.value}
                  onClick={() => patch({ height: height.value })}
                >
                  {height.label}
                </button>
              ))}
            </div>
          </div>

          <div className="chart-field chart-field--wide">
            <span className="chart-field__label">Display</span>
            <div className="chart-toggles">
              <label className="chart-toggle">
                <input
                  type="checkbox"
                  checked={draft.showLegend}
                  onChange={(event) => patch({ showLegend: event.target.checked })}
                />
                Legend
              </label>
              {!isPie && (
                <label className="chart-toggle">
                  <input
                    type="checkbox"
                    checked={draft.showGrid}
                    onChange={(event) => patch({ showGrid: event.target.checked })}
                  />
                  Grid lines
                </label>
              )}
              <label className="chart-toggle">
                <input
                  type="checkbox"
                  checked={draft.showValues}
                  onChange={(event) => patch({ showValues: event.target.checked })}
                />
                Values
              </label>
              {draft.kind === 'bar' && (
                <label className="chart-toggle">
                  <input
                    type="checkbox"
                    checked={draft.stacked}
                    onChange={(event) => patch({ stacked: event.target.checked })}
                  />
                  Stacked
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="chart-data">
          <div className="chart-data__head">
            <span className="chart-data__title">Data</span>
            <div className="chart-data__actions">
              <button type="button" className="btn" onClick={addRow}>
                <Plus size={14} /> Add row
              </button>
              {!isPie && (
                <button
                  type="button"
                  className="btn"
                  onClick={addSeries}
                  disabled={draft.series.length >= 4}
                >
                  <Plus size={14} /> Add series
                </button>
              )}
            </div>
          </div>
          {isPie && draft.series.length > 1 && (
            <p className="chart-data__hint">
              Pie and donut charts use the first series.
            </p>
          )}
          <div className="chart-data__scroll">
            <table className="chart-data__table">
              <thead>
                <tr>
                  <th>Category</th>
                  {visibleSeries.map((series, visibleIndex) => (
                    <th key={`head-${visibleIndex}`}>
                      <div className="chart-data__series-head">
                        <input
                          value={series.name}
                          aria-label="Series name"
                          onChange={(event) =>
                            setSeriesName(
                              isPie ? 0 : visibleIndex,
                              event.target.value,
                            )
                          }
                        />
                        {!isPie && draft.series.length > 1 && (
                          <button
                            type="button"
                            className="chart-data__remove"
                            aria-label="Remove series"
                            onClick={() => removeSeries(visibleIndex)}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th aria-label="Row actions" />
                </tr>
              </thead>
              <tbody>
                {draft.labels.map((label, rowIndex) => (
                  <tr key={`row-${rowIndex}`}>
                    <td>
                      <input
                        value={label}
                        aria-label={`Category ${rowIndex + 1}`}
                        onChange={(event) => setLabel(rowIndex, event.target.value)}
                      />
                    </td>
                    {visibleSeries.map((series, visibleIndex) => {
                      const seriesIndex = isPie ? 0 : visibleIndex
                      return (
                        <td key={`cell-${rowIndex}-${visibleIndex}`}>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={series.values[rowIndex] ?? 0}
                            aria-label={`${series.name} value for ${label}`}
                            onChange={(event) =>
                              setValue(seriesIndex, rowIndex, event.target.value)
                            }
                          />
                        </td>
                      )
                    })}
                    <td>
                      <button
                        type="button"
                        className="chart-data__remove"
                        aria-label="Remove row"
                        disabled={draft.labels.length <= 2}
                        onClick={() => removeRow(rowIndex)}
                      >
                        <Trash size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        <footer className="chart-dialog__foot">
          <span className="chart-dialog__hint">
            Charts are real SVG — they scale with the page and work in dark mode.
          </span>
          <div className="chart-dialog__actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!canApply}
              onClick={submit}
            >
              Apply chart
            </button>
          </div>
        </footer>
      </div>
    </div>)
}
