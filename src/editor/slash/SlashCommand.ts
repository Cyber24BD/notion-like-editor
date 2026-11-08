import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { PluginKey } from '@tiptap/pm/state'
import { slashItems } from './items'
import { slashMenu } from './menuStore'
import { filterSlashItems, type SlashItem } from './types'

export const slashPluginKey = new PluginKey('slashCommand')

export interface SlashCommandOptions {
  items: SlashItem[]
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return { items: slashItems }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        char: '/',
        pluginKey: slashPluginKey,
        allowSpaces: true,
        allowedPrefixes: [' ', '\u00a0'],
        startOfLine: false,
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from)
          return $from.parent.type.name !== 'codeBlock'
        },
        // Only open for a freshly typed "/", not when the caret is merely
        // moved next to an existing slash (e.g. clicking a cell containing "/").
        shouldShow: ({ transaction }) =>
          slashMenu.getSnapshot().open || transaction.docChanged,
        items: ({ query }) =>
          filterSlashItems(this.options.items, query).slice(0, 40),
        command: ({ editor, range, props }) => {
          props.run({ editor, range })
          slashMenu.close()
        },
        render: () => ({
          onStart: (props) => {
            slashMenu.open({
              items: props.items,
              rect: props.clientRect?.() ?? null,
              getRect: props.clientRect ?? null,
              query: props.query,
              mode: 'suggestion',
              onSelect: (item) => props.command(item),
            })
          },
          onUpdate: (props) => {
            slashMenu.update({
              items: props.items,
              rect: props.clientRect?.() ?? null,
              query: props.query,
              onSelect: (item) => props.command(item),
            })
          },
          onExit: () => {
            slashMenu.close()
          },
          onKeyDown: ({ event }) => {
            if (!slashMenu.getSnapshot().open) return false
            switch (event.key) {
              case 'ArrowDown':
                event.preventDefault()
                slashMenu.move(1)
                return true
              case 'ArrowUp':
                event.preventDefault()
                slashMenu.move(-1)
                return true
              case 'Enter':
              case 'Tab':
                event.preventDefault()
                slashMenu.selectActive()
                return true
              case 'Escape':
                event.preventDefault()
                slashMenu.close()
                return true
              default:
                return false
            }
          },
        }),
      }),
    ]
  },
})
