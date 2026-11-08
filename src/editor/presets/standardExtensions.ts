import type { Extensions } from '@tiptap/core'
import { CodeBlock } from '../nodes/CodeBlock'
import { VideoEmbed } from '../nodes/VideoEmbed'
import { Bookmark } from '../nodes/Bookmark'
import { TableOfContents } from '../nodes/TableOfContents'
import { Chart } from '../nodes/Chart'
import { SlashCommand } from '../slash/SlashCommand'
import { slashItems } from '../slash/items'
import { STANDARD_FEATURES } from '../features'
import { buildCoreExtensions, type PresetExtensionsOptions } from './coreExtensions'

const standardItems = slashItems.filter(
  (item) => !item.feature || STANDARD_FEATURES[item.feature],
)

export function createExtensions(
  options: PresetExtensionsOptions = {},
): Extensions {
  return [
    ...buildCoreExtensions(options.extensions),
    CodeBlock,
    VideoEmbed,
    Bookmark,
    TableOfContents,
    Chart,
    SlashCommand.configure({ items: standardItems }),
  ]
}
