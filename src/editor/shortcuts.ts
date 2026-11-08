export interface ShortcutItem {
  keys: string
  label: string
  note?: string
}

export interface ShortcutGroup {
  title: string
  items: ShortcutItem[]
}

/**
 * Keep this list in sync with the actions wired in PageEditor/App. The help
 * dialog renders these groups and swaps Mod/Alt/Shift for the local platform.
 */
export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'General',
    items: [
      { keys: 'Mod+K', label: 'Search pages', note: 'Demo app' },
      { keys: 'Mod+F', label: 'Find in page' },
      { keys: 'Mod+H', label: 'Find and replace' },
      { keys: 'Mod+/', label: 'Keyboard shortcuts' },
      { keys: 'Mod+Shift+M', label: 'Toggle light/dark mode', note: 'Demo app' },
      { keys: 'Esc', label: 'Close a menu, dialog or block selection' },
    ],
  },
  {
    title: 'Text formatting',
    items: [
      { keys: 'Mod+B', label: 'Bold' },
      { keys: 'Mod+I', label: 'Italic' },
      { keys: 'Mod+U', label: 'Underline' },
      { keys: 'Mod+Shift+S', label: 'Strikethrough' },
      { keys: 'Mod+E', label: 'Inline code' },
      { keys: 'Mod+Shift+H', label: 'Highlight' },
      { keys: 'Mod+Enter', label: 'Insert equation', note: 'Math dialog' },
    ],
  },
  {
    title: 'Blocks',
    items: [
      { keys: '/', label: 'Open the block menu' },
      { keys: 'Mod+Alt+1', label: 'Heading 1' },
      { keys: 'Mod+Alt+2', label: 'Heading 2' },
      { keys: 'Mod+Alt+3', label: 'Heading 3' },
      { keys: 'Mod+Shift+7', label: 'Numbered list' },
      { keys: 'Mod+Shift+8', label: 'Bulleted list' },
      { keys: 'Mod+Shift+9', label: 'To-do list' },
      { keys: 'Tab', label: 'Indent inside code or nested lists' },
    ],
  },
  {
    title: 'Selection and blocks',
    items: [
      { keys: 'Shift+Click', label: 'Select a range of blocks' },
      { keys: 'Mod+D', label: 'Duplicate selected blocks' },
      { keys: 'Mod+C', label: 'Copy selected blocks' },
      { keys: 'Delete', label: 'Delete selected blocks' },
      { keys: 'Esc', label: 'Clear the block selection' },
    ],
  },
]

export function formatShortcut(keys: string, isMac: boolean): string {
  return keys
    .split('+')
    .map((part) => {
      if (part === 'Mod') return isMac ? '⌘' : 'Ctrl'
      if (part === 'Alt') return isMac ? '⌥' : 'Alt'
      if (part === 'Shift') return isMac ? '⇧' : 'Shift'
      return part
    })
    .join(isMac ? '' : '+')
}
