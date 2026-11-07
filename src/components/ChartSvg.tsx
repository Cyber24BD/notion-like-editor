import { useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import {
  formatChartValue,
  isLightColor,
  niceMax,
  PALETTES,
  truncateLabel,
  type ChartData,
} from '../editor/chart/types'

const WIDTH = 760
const MARGIN = { top: 14, right: 18, bottom: 38, left: 50 }

interface Point {
  x: number
  y: number
}

interface Tooltip {
  x: number
  y: number
  label: string
  series?: string
  value: string
  color: string
}

function smoothPath(points: Point[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  let path = `M ${points[0].x} ${points[0].y}`
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index]
    const p1 = points[index]
    const p2 = points[index + 1]
    const p3 = points[index + 2] ?? p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return path
}

function polar(cx: number, cy: number, radius: number, angle: number): Point {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
}

function slicePath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  start: number,
  end: number,
): string {
  const large = end - start > Math.PI ? 1 : 0
  const outerStart = polar(cx, cy, outer, start)
  const outerEnd = polar(cx, cy, outer, end)
  if (inner <= 0) {
    return [
      `M ${cx} ${cy}`,
      `L ${outerStart.x} ${outerStart.y}`,
      `A ${outer} ${outer} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y}`,
      'Z',
    ].join(' ')
  }
  const innerEnd = polar(cx, cy, inner, end)
  const innerStart = polar(cx, cy, inner, start)
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outer} ${outer} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${inner} ${inner} 0 ${large} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ')
}

interface ChartSvgProps {
  chart: ChartData
  className?: string
}

export function ChartSvg({ chart, className }: ChartSvgProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  const colors = PALETTES[chart.palette] ?? PALETTES.notion
  const height = chart.height
  const isPie = chart.kind === 'pie' || chart.kind === 'donut'
  const plotW = WIDTH - MARGIN.left - MARGIN.right
  const plotH = height - MARGIN.top - MARGIN.bottom

  const showTooltip = (
    event: { clientX: number; clientY: number },
    data: Omit<Tooltip, 'x' | 'y'>,
  ) => {
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.max(40, Math.min(rect.width - 40, event.clientX - rect.left))
    const y = event.clientY - rect.top
    setTooltip({ ...data, x, y })
  }

  const legendItems = useMemo(() => {
    if (isPie) {
      return chart.labels.map((label, index) => ({
        label,
        color: colors[index % colors.length],
      }))
    }
    return chart.series.map((series, index) => ({
      label: series.name,
      color: colors[index % colors.length],
    }))
  }, [chart.labels, chart.series, colors, isPie])

  const geometry = useMemo(() => {
    const values = chart.series.flatMap((series) => series.values)
    const categoryTotals = chart.labels.map((_, index) =>
      chart.series.reduce((sum, series) => sum + (series.values[index] ?? 0), 0),
    )
    const maxValue =
      chart.stacked && !isPie
        ? Math.max(0, ...categoryTotals)
        : Math.max(0, ...values)
    const yMax = niceMax(maxValue)
    const ticks = Array.from({ length: 5 }, (_, index) => (yMax / 4) * index)
    const baseline = MARGIN.top + plotH
    const scaleY = (value: number) => baseline - (value / yMax) * plotH
    return { yMax, ticks, baseline, scaleY }
  }, [chart.labels, chart.series, chart.stacked, isPie, plotH, plotW])

  if (isPie) {
    const values = chart.series[0]?.values ?? []
    const total = values.reduce((sum, value) => sum + value, 0)
    const cx = MARGIN.left + plotW / 2
    const cy = MARGIN.top + plotH / 2
    const radius = Math.max(20, Math.min(plotW, plotH) / 2 - 12)
    const inner = chart.kind === 'donut' ? radius * 0.58 : 0

    if (total <= 0) {
      return (
        <ChartShell
          chart={chart}
          legend={legendItems}
          wrapperRef={wrapperRef}
          className={className}
          onMouseLeave={() => setTooltip(null)}
        >
          <div className="chart-empty">Add values to see this chart.</div>
        </ChartShell>
      )
    }

    let cursor = -Math.PI / 2
    const slices = values.map((value, index) => {
      const fraction = value / total
      const start = cursor
      const end = cursor + fraction * Math.PI * 2
      cursor = end
      const mid = (start + end) / 2
      const labelPoint = polar(cx, cy, (radius + inner) / 2, mid)
      return {
        index,
        value,
        fraction,
        start,
        end,
        color: colors[index % colors.length],
        labelPoint,
        label: chart.labels[index] ?? '',
      }
    })

    return (
      <ChartShell
        chart={chart}
        legend={legendItems}
        wrapperRef={wrapperRef}
        className={className}
        onMouseLeave={() => setTooltip(null)}
      >
        <div className="chart-canvas">
          <svg
            className="chart-svg"
            viewBox={`0 0 ${WIDTH} ${height}`}
            role="img"
            aria-label={chart.title || 'Pie chart'}
          >
          <title>{chart.title || 'Pie chart'}</title>
          {slices.map((slice) => (
            <path
              key={`${slice.label}-${slice.index}`}
              className="chart-slice"
              d={slicePath(cx, cy, radius, inner, slice.start, slice.end)}
              fill={slice.color}
              onMouseEnter={(event) =>
                showTooltip(event, {
                  label: slice.label,
                  value: formatChartValue(slice.value, chart.suffix),
                  color: slice.color,
                })
              }
            />
          ))}
          {chart.showValues &&
            slices
              .filter((slice) => slice.fraction >= 0.06)
              .map((slice) => (
                <text
                  key={`value-${slice.index}`}
                  x={slice.labelPoint.x}
                  y={slice.labelPoint.y}
                  className="chart-slice-label"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isLightColor(slice.color) ? '#1f1f1f' : '#ffffff'}
                >
                  {Math.round(slice.fraction * 100)}%
                </text>
              ))}
          {chart.kind === 'donut' && (
            <>
              <text
                x={cx}
                y={cy - 4}
                textAnchor="middle"
                className="chart-donut-total"
              >
                {formatChartValue(total, chart.suffix)}
              </text>
              <text
                x={cx}
                y={cy + 15}
                textAnchor="middle"
                className="chart-donut-label"
              >
                Total
              </text>
            </>
          )}
          </svg>
        </div>
        {tooltip && <ChartTooltip tooltip={tooltip} />}
      </ChartShell>
    )
  }

  const band = plotW / Math.max(1, chart.labels.length)
  const groupWidth = band * 0.68
  const seriesCount = chart.series.length
  const barGap = seriesCount > 1 ? 2 : 0
  const barWidth = chart.stacked
    ? groupWidth
    : (groupWidth - barGap * (seriesCount - 1)) / Math.max(1, seriesCount)

  const pointsBySeries = chart.series.map((series) =>
    series.values.map((value, index) => ({
      x: MARGIN.left + band * index + band / 2,
      y: geometry.scaleY(value),
    })),
  )

  return (
    <ChartShell
      chart={chart}
      legend={legendItems}
      wrapperRef={wrapperRef}
      className={className}
      onMouseLeave={() => setTooltip(null)}
    >
      <div className="chart-canvas">
        <svg
          className="chart-svg"
          viewBox={`0 0 ${WIDTH} ${height}`}
          role="img"
          aria-label={chart.title || 'Bar chart'}
          data-chart-type={chart.kind}
        >
        <title>{chart.title || `${chart.kind} chart`}</title>

        {chart.showGrid &&
          geometry.ticks.map((tick) => {
            const y = geometry.scaleY(tick)
            return (
              <line
                key={`grid-${tick}`}
                x1={MARGIN.left}
                x2={WIDTH - MARGIN.right}
                y1={y}
                y2={y}
                className="chart-grid"
              />
            )
          })}

        {geometry.ticks.map((tick) => (
          <text
            key={`tick-${tick}`}
            x={MARGIN.left - 10}
            y={geometry.scaleY(tick) + 3.5}
            textAnchor="end"
            className="chart-axis-label"
          >
            {formatChartValue(tick, chart.suffix)}
          </text>
        ))}

        <line
          x1={MARGIN.left}
          x2={WIDTH - MARGIN.right}
          y1={geometry.baseline}
          y2={geometry.baseline}
          className="chart-axis"
        />

        {chart.labels.map((label, index) => (
          <text
            key={`label-${index}`}
            x={MARGIN.left + band * index + band / 2}
            y={height - 14}
            textAnchor="middle"
            className="chart-axis-label"
          >
            {label.length > 13 && <title>{label}</title>}
            {truncateLabel(label)}
          </text>
        ))}

        {chart.kind === 'bar' ? (
          <>
            {chart.labels.map((label, labelIndex) => {
              const groupLeft =
                MARGIN.left + band * labelIndex + (band - groupWidth) / 2
              let stackBottom = 0
              return (
                <g key={`group-${labelIndex}`}>
                  {chart.series.map((series, seriesIndex) => {
                    const value = series.values[labelIndex] ?? 0
                    const color = colors[seriesIndex % colors.length]
                    const x = chart.stacked
                      ? groupLeft
                      : groupLeft + seriesIndex * (barWidth + barGap)
                    const topValue = chart.stacked ? stackBottom + value : value
                    const y = geometry.scaleY(topValue)
                    const heightValue = Math.max(
                      0,
                      geometry.scaleY(stackBottom) - y,
                    )
                    stackBottom = topValue
                    if (heightValue <= 0) return null
                    return (
                      <rect
                        key={`bar-${labelIndex}-${seriesIndex}`}
                        className="chart-bar"
                        x={x}
                        y={y}
                        width={barWidth}
                        height={heightValue}
                        rx={Math.min(3, barWidth / 3)}
                        fill={color}
                        onMouseEnter={(event) =>
                          showTooltip(event, {
                            label,
                            series: series.name,
                            value: formatChartValue(value, chart.suffix),
                            color,
                          })
                        }
                      />
                    )
                  })}
                  {chart.showValues && (
                    <text
                      x={groupLeft + groupWidth / 2}
                      y={
                        geometry.scaleY(
                          chart.stacked ? stackBottom : Math.max(...chart.series.map((series) => series.values[labelIndex] ?? 0)),
                        ) - 6
                      }
                      textAnchor="middle"
                      className="chart-value-label"
                    >
                      {formatChartValue(
                        chart.stacked
                          ? stackBottom
                          : Math.max(...chart.series.map((series) => series.values[labelIndex] ?? 0)),
                        chart.suffix,
                      )}
                    </text>
                  )}
                </g>
              )
            })}
          </>
        ) : (
          <>
            {chart.kind === 'area' &&
              pointsBySeries.map((points, seriesIndex) => {
                if (points.length === 0) return null
                const color = colors[seriesIndex % colors.length]
                const line = smoothPath(points)
                const area = `${line} L ${points[points.length - 1].x} ${geometry.baseline} L ${points[0].x} ${geometry.baseline} Z`
                return (
                  <path
                    key={`area-${seriesIndex}`}
                    d={area}
                    fill={color}
                    className="chart-area"
                  />
                )
              })}

            {pointsBySeries.map((points, seriesIndex) => {
              const color = colors[seriesIndex % colors.length]
              return (
                <path
                  key={`line-${seriesIndex}`}
                  d={smoothPath(points)}
                  fill="none"
                  stroke={color}
                  className="chart-line"
                />
              )
            })}

            {pointsBySeries.map((points, seriesIndex) =>
              points.map((point, labelIndex) => {
                const color = colors[seriesIndex % colors.length]
                const series = chart.series[seriesIndex]
                const value = series?.values[labelIndex] ?? 0
                return (
                  <g key={`point-${seriesIndex}-${labelIndex}`}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={8}
                      fill="transparent"
                      onMouseEnter={(event) =>
                        showTooltip(event, {
                          label: chart.labels[labelIndex] ?? '',
                          series: series?.name,
                          value: formatChartValue(value, chart.suffix),
                          color,
                        })
                      }
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={3}
                      fill="var(--bg-elevated)"
                      stroke={color}
                      className="chart-dot"
                    />
                    {chart.showValues && (
                      <text
                        x={point.x}
                        y={point.y - 9}
                        textAnchor="middle"
                        className="chart-value-label"
                      >
                        {formatChartValue(value, chart.suffix)}
                      </text>
                    )}
                  </g>
                )
              }),
            )}
          </>
        )}
        </svg>
      </div>
      {tooltip && <ChartTooltip tooltip={tooltip} />}
    </ChartShell>
  )
}

interface ChartShellProps {
  chart: ChartData
  legend: { label: string; color: string }[]
  wrapperRef: RefObject<HTMLDivElement | null>
  className?: string
  onMouseLeave: () => void
  children: ReactNode
}

function ChartShell({
  chart,
  legend,
  wrapperRef,
  className,
  onMouseLeave,
  children,
}: ChartShellProps) {
  return (
    <div
      ref={wrapperRef}
      className={`chart-shell ${className ?? ''}`}
      data-chart-kind={chart.kind}
      onMouseLeave={onMouseLeave}
    >
      {chart.title && <div className="chart-title">{chart.title}</div>}
      {chart.showLegend && legend.length > 0 && (
        <div className="chart-legend">
          {legend.map((item, index) => (
            <span className="chart-legend__item" key={`${item.label}-${index}`}>
              <span
                className="chart-legend__dot"
                style={{ background: item.color }}
                aria-hidden="true"
              />
              {item.label}
            </span>
          ))}
        </div>
      )}
      {children}
    </div>
  )
}

function ChartTooltip({ tooltip }: { tooltip: Tooltip }) {
  return (
    <div
      className="chart-tooltip"
      style={{ left: tooltip.x, top: tooltip.y }}
      role="status"
    >
      <span
        className="chart-tooltip__dot"
        style={{ background: tooltip.color }}
        aria-hidden="true"
      />
      <div>
        <div className="chart-tooltip__label">{tooltip.label}</div>
        {tooltip.series && (
          <div className="chart-tooltip__series">{tooltip.series}</div>
        )}
        <div className="chart-tooltip__value">{tooltip.value}</div>
      </div>
    </div>
  )
}
