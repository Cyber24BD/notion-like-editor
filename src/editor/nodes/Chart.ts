import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ChartView } from '../../components/nodes/ChartView'
import {
  defaultChart,
  normalizeChart,
  type ChartData,
} from '../chart/types'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    chart: {
      insertChart: (chart?: Partial<ChartData>) => ReturnType
    }
  }
}

export const Chart = Node.create({
  name: 'chart',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      chart: {
        default: defaultChart(),
        parseHTML: (element) => {
          const raw = element.getAttribute('data-chart')
          if (!raw) return defaultChart()
          try {
            return normalizeChart(JSON.parse(raw))
          } catch {
            return defaultChart()
          }
        },
        renderHTML: (attributes) => ({
          'data-chart': JSON.stringify(attributes.chart ?? defaultChart()),
        }),
      },
      caption: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-caption') ?? '',
        renderHTML: (attributes) => ({
          'data-caption': String(attributes.caption ?? ''),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="chart"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const chart = normalizeChart(node.attrs.chart)
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'chart' }),
      ['strong', {}, chart.title || 'Chart'],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartView)
  },

  addCommands() {
    return {
      insertChart:
        (attributes) =>
        ({ state, commands }) => {
          const chart = normalizeChart({ ...defaultChart(), ...attributes })
          const node = state.schema.nodes.chart.create({ chart })
          const { $from } = state.selection
          const isEmpty =
            $from.parent.isTextblock && $from.parent.content.size === 0
          const pos = isEmpty ? $from.before($from.depth) : $from.after($from.depth)
          const inserted = commands.insertContentAt(pos, node)
          if (inserted) commands.setNodeSelection(pos)
          return inserted
        },
    }
  },
})
