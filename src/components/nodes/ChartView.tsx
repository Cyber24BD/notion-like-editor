import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { ChartSvg } from '../ChartSvg'
import { LazyChartSettingsDialog } from '../lazy/LazyWidgets'
import {
  CHART_KINDS,
  PALETTES,
  PALETTE_OPTIONS,
  normalizeChart,
  type ChartData,
  type ChartKind,
} from '../../editor/chart/types'
import { Menu, type MenuNode } from '../Menu'
import {
  ChartArea,
  ChartBar,
  ChartDonut,
  ChartLine,
  ChartPie,
  ChevronDown,
  Palette,
  Settings,
  Table as TableIcon,
  Trash,
} from '../Icons'

const KIND_ICONS: Record<ChartKind, ReactNode> = {
  bar: <ChartBar size={15} />,
  line: <ChartLine size={15} />,
  area: <ChartArea size={15} />,
  pie: <ChartPie size={15} />,
  donut: <ChartDonut size={15} />,
}

const TOOLBAR_WIDTH = 356

type MenuKind = 'kind' | 'palette' | 'options'

export function ChartView({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const chart = useMemo(() => normalizeChart(node.attrs.chart), [node.attrs.chart])
  const caption = String(node.attrs.caption ?? '')
  const frameRef = useRef<HTMLDivElement>(null)
  const [toolbarAt, setToolbarAt] = useState<{ top: number; left: number } | null>(null)
  const [menu, setMenu] = useState<{ kind: MenuKind; x: number; y: number } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [captionDraft, setCaptionDraft] = useState(caption)

  useEffect(() => {
    setCaptionDraft(caption)
  }, [caption])

  const updateToolbarPosition = useCallback(() => {
    const element = frameRef.current
    if (!element || !selected) {
      setToolbarAt(null)
      return
    }
    const rect = element.getBoundingClientRect()
    const barWidth = Math.min(TOOLBAR_WIDTH, window.innerWidth - 16)
    let left = rect.left + rect.width / 2 - barWidth / 2
    left = Math.max(8, Math.min(left, window.innerWidth - barWidth - 8))
    let top = rect.top - 48
    if (top < 56) top = rect.bottom + 10
    setToolbarAt((previous) =>
      previous &&
      Math.abs(previous.top - top) < 0.5 &&
      Math.abs(previous.left - left) < 0.5
        ? previous
        : { top, left },
    )
  }, [selected])

  useLayoutEffect(() => {
    updateToolbarPosition()
  }, [updateToolbarPosition, chart.height, selected])

  useEffect(() => {
    if (!selected || !frameRef.current) return
    const observer = new ResizeObserver(() => updateToolbarPosition())
    observer.observe(frameRef.current)
    return () => observer.disconnect()
  }, [selected, updateToolbarPosition])

  useEffect(() => {
    if (!selected) return
    let frameId = 0
    const onChange = () => {
      if (frameId) return
      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        updateToolbarPosition()
      })
    }
    window.addEventListener('scroll', onChange, true)
    window.addEventListener('resize', onChange)
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId)
      window.removeEventListener('scroll', onChange, true)
      window.removeEventListener('resize', onChange)
    }
  }, [selected, updateToolbarPosition])

  const updateChart = (patch: Partial<ChartData>) => {
    updateAttributes({ chart: { ...chart, ...patch } })
  }

  const selectNode = () => {
    const pos = getPos()
    if (!selected && typeof pos === 'number') {
      editor.commands.setNodeSelection(pos)
    }
  }

  const remove = () => {
    const pos = getPos()
    if (typeof pos !== 'number') return
    editor
      .chain()
      .focus()
      .deleteRange({ from: pos, to: pos + node.nodeSize })
      .run()
  }

  const openMenu = (kind: MenuKind) => (event: ReactMouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setMenu({ kind, x: rect.left, y: rect.bottom + 6 })
  }

  const kindLabel =
    CHART_KINDS.find((kind) => kind.value === chart.kind)?.label ?? 'Bar'
  const isPie = chart.kind === 'pie' || chart.kind === 'donut'

  const kindEntries: MenuNode[] = CHART_KINDS.map((kind) => ({
    id: kind.value,
    label: kind.label,
    icon: KIND_ICONS[kind.value],
    shortcut: chart.kind === kind.value ? '✓' : undefined,
    onSelect: () => updateChart({ kind: kind.value }),
  }))

  const paletteEntries: MenuNode[] = PALETTE_OPTIONS.map((palette) => ({
    id: palette.value,
    label: palette.label,
    icon: (
      <span className="chart-palette__dots chart-palette__dots--menu">
        {PALETTES[palette.value].slice(0, 4).map((color) => (
          <span key={color} style={{ background: color }} />
        ))}
      </span>
    ),
    shortcut: chart.palette === palette.value ? '✓' : undefined,
    onSelect: () => updateChart({ palette: palette.value }),
  }))

  const optionsEntries: MenuNode[] = [
    {
      id: 'legend',
      label: 'Legend',
      shortcut: chart.showLegend ? '✓' : undefined,
      keepOpen: true,
      onSelect: () => updateChart({ showLegend: !chart.showLegend }),
    },
    ...(!isPie
      ? [
          {
            id: 'grid',
            label: 'Grid lines',
            shortcut: chart.showGrid ? '✓' : undefined,
            keepOpen: true,
            onSelect: () => updateChart({ showGrid: !chart.showGrid }),
          } satisfies MenuNode,
        ]
      : []),
    {
      id: 'values',
      label: 'Show values',
      shortcut: chart.showValues ? '✓' : undefined,
      keepOpen: true,
      onSelect: () => updateChart({ showValues: !chart.showValues }),
    },
    ...(chart.kind === 'bar'
      ? [
          {
            id: 'stacked',
            label: 'Stacked bars',
            shortcut: chart.stacked ? '✓' : undefined,
            keepOpen: true,
            onSelect: () => updateChart({ stacked: !chart.stacked }),
          } satisfies MenuNode,
        ]
      : []),
    { type: 'separator', id: 'options-sep' },
    ...([220, 280, 360] as const).map((height) => ({
      id: `height-${height}`,
      label:
        height === 220 ? 'Compact height' : height === 280 ? 'Regular height' : 'Tall height',
      shortcut: chart.height === height ? '✓' : undefined,
      onSelect: () => updateChart({ height }),
    })),
  ]

  const toolbar =
    selected && !settingsOpen && toolbarAt
      ? createPortal(
          <div
            className="image-toolbar chart-toolbar popover"
            style={{ top: toolbarAt.top, left: toolbarAt.left }}
            role="toolbar"
            aria-label="Chart block toolbar"
            contentEditable={false}
            onMouseDown={(event) => event.preventDefault()}
          >
            <button
              type="button"
              className="image-toolbar__btn image-toolbar__btn--wide"
              aria-haspopup="menu"
              aria-label="Chart type"
              data-tooltip="Chart type"
              onClick={openMenu('kind')}
            >
              {KIND_ICONS[chart.kind]}
              <span>{kindLabel}</span>
              <ChevronDown size={9} />
            </button>
            <span className="image-toolbar__divider" />
            <button
              type="button"
              className="image-toolbar__btn image-toolbar__btn--wide"
              aria-label="Edit chart data"
              data-tooltip="Edit chart data"
              onClick={() => {
                setMenu(null)
                setSettingsOpen(true)
              }}
            >
              <TableIcon size={15} />
              <span>Data</span>
            </button>
            <button
              type="button"
              className="image-toolbar__btn"
              aria-haspopup="menu"
              aria-label="Chart palette"
              data-tooltip="Palette"
              onClick={openMenu('palette')}
            >
              <Palette size={15} />
            </button>
            <button
              type="button"
              className="image-toolbar__btn"
              aria-haspopup="menu"
              aria-label="Display options"
              data-tooltip="Display options"
              onClick={openMenu('options')}
            >
              <Settings size={15} />
            </button>
            <span className="image-toolbar__divider" />
            <button
              type="button"
              className="image-toolbar__btn image-toolbar__btn--danger"
              aria-label="Delete chart"
              data-tooltip="Delete chart"
              onClick={remove}
            >
              <Trash size={15} />
            </button>
          </div>,
          document.body,
        )
      : null

  return (
    <NodeViewWrapper
      className="chart-block"
      data-selected={selected ? 'true' : 'false'}
      data-chart-kind={chart.kind}
      data-has-caption={caption ? 'true' : 'false'}
      contentEditable={false}
    >
      <div
        ref={frameRef}
        className="chart-block__canvas"
        onClick={() => selectNode()}
      >
        <ChartSvg chart={chart} />
      </div>

      <div className="chart-block__caption-wrap">
        <input
          className="chart-block__caption"
          value={captionDraft}
          placeholder="Add a caption…"
          aria-label="Chart caption"
          onChange={(event) => {
            const next = event.target.value
            setCaptionDraft(next)
            updateAttributes({ caption: next })
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              editor.commands.focus('end')
            }
          }}
        />
      </div>

      {toolbar}

      {menu?.kind === 'kind' && (
        <Menu
          x={menu.x}
          y={menu.y}
          width={188}
          entries={kindEntries}
          header={<div className="menu__header">Chart type</div>}
          onClose={() => setMenu(null)}
        />
      )}
      {menu?.kind === 'palette' && (
        <Menu
          x={menu.x}
          y={menu.y}
          width={196}
          entries={paletteEntries}
          header={<div className="menu__header">Palette</div>}
          onClose={() => setMenu(null)}
        />
      )}
      {menu?.kind === 'options' && (
        <Menu
          x={menu.x}
          y={menu.y}
          width={214}
          entries={optionsEntries}
          header={<div className="menu__header">Display</div>}
          onClose={() => setMenu(null)}
        />
      )}

      {settingsOpen && (
        <LazyChartSettingsDialog
          initial={chart}
          onApply={(next) => updateAttributes({ chart: next })}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </NodeViewWrapper>
  )
}
