import type { Editor } from '@tiptap/core'
import { columnIsHeader, rowIsHeader, selectedRect } from '@tiptap/pm/tables'

/** Uses the table extension's own cell selection command (single module copy). */
function selectCells(editor: Editor, anchorCell: number, headCell: number) {
  editor
    .chain()
    .focus()
    .setCellSelection({ anchorCell, headCell })
    .scrollIntoView()
    .run()
}

/**
 * Selects the whole row that currently contains the cursor/selection.
 */
export function selectCurrentRow(editor: Editor): boolean {
  const state = editor.state
  const rect = selectedRect(state)
  const row = rect.top
  const first = rect.map.positionAt(row, 0, rect.table)
  const last = rect.map.positionAt(row, rect.map.width - 1, rect.table)
  selectCells(editor, rect.tableStart + first, rect.tableStart + last)
  return true
}

/**
 * Selects the whole column that currently contains the cursor/selection.
 */
export function selectCurrentColumn(editor: Editor): boolean {
  const state = editor.state
  const rect = selectedRect(state)
  const column = rect.left
  const first = rect.map.positionAt(0, column, rect.table)
  const last = rect.map.positionAt(rect.map.height - 1, column, rect.table)
  selectCells(editor, rect.tableStart + first, rect.tableStart + last)
  return true
}

/** Selects every cell in the table. */
export function selectWholeTable(editor: Editor): boolean {
  const state = editor.state
  const rect = selectedRect(state)
  const first = rect.map.positionAt(0, 0, rect.table)
  const last = rect.map.positionAt(
    rect.map.height - 1,
    rect.map.width - 1,
    rect.table,
  )
  selectCells(editor, rect.tableStart + first, rect.tableStart + last)
  return true
}

/** Index information for the current cell, used by the table toolbar menus. */
export function currentCellInfo(editor: Editor) {
  const rect = selectedRect(editor.state)
  return {
    row: rect.top,
    column: rect.left,
    rows: rect.map.height,
    columns: rect.map.width,
    isHeaderRow: rowIsHeader(rect.map, rect.table, rect.top),
    isHeaderColumn: columnIsHeader(rect.map, rect.table, rect.left),
  }
}
