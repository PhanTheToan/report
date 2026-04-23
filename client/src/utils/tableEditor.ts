import type { Editor } from '@tiptap/react';
import { TableMap, cellAround, findTable } from '@tiptap/pm/tables';

export interface TableHeaderState {
  hasHeaderRow: boolean;
  hasHeaderColumn: boolean;
}

function getTableContext(editor: Editor) {
  const { $from } = editor.state.selection;
  const table = findTable($from);
  const anchorCell = cellAround($from);

  if (!table || !anchorCell) {
    return null;
  }

  const map = TableMap.get(table.node);
  const anchorRect = map.findCell(anchorCell.pos - table.start);

  return {
    table,
    map,
    anchorRect
  };
}

export function getSelectedColumnWidth(editor: Editor) {
  const cellType = editor.isActive('tableHeader') ? 'tableHeader' : editor.isActive('tableCell') ? 'tableCell' : null;

  if (!cellType) {
    return null;
  }

  const attrs = editor.getAttributes(cellType);
  const widths = attrs.colwidth;

  return Array.isArray(widths) && typeof widths[0] === 'number' ? widths[0] : null;
}

export function setSelectedColumnWidth(editor: Editor, width: number | null) {
  const context = getTableContext(editor);

  if (!context) {
    return false;
  }

  const { state, view } = editor;
  const { table, map, anchorRect } = context;
  const tr = state.tr;
  const updatedPositions = new Set<number>();

  for (let rowIndex = 0; rowIndex < map.height; rowIndex += 1) {
    const relativePos = map.positionAt(rowIndex, anchorRect.left, table.node);
    const cellPos = table.start + relativePos;

    if (updatedPositions.has(cellPos)) {
      continue;
    }

    const cellNode = tr.doc.nodeAt(cellPos);

    if (!cellNode) {
      continue;
    }

    const colspan = typeof cellNode.attrs.colspan === 'number' ? cellNode.attrs.colspan : 1;

    tr.setNodeMarkup(cellPos, undefined, {
      ...cellNode.attrs,
      colwidth: width === null ? null : Array.from({ length: colspan }, () => width)
    });

    updatedPositions.add(cellPos);
  }

  if (!tr.docChanged) {
    return false;
  }

  view.dispatch(tr);
  view.focus();
  return true;
}

export function getTableHeaderState(editor: Editor): TableHeaderState {
  const context = getTableContext(editor);

  if (!context) {
    return {
      hasHeaderRow: false,
      hasHeaderColumn: false
    };
  }

  const { table } = context;
  const firstRow = table.node.firstChild;

  const hasHeaderRow =
    !!firstRow &&
    firstRow.childCount > 0 &&
    Array.from({ length: firstRow.childCount }, (_, index) => firstRow.child(index)).every((cell) => cell.type.name === 'tableHeader');

  const hasHeaderColumn =
    table.node.childCount > 0 &&
    Array.from({ length: table.node.childCount }, (_, rowIndex) => table.node.child(rowIndex))
      .filter((row) => row.childCount > 0)
      .every((row) => row.child(0).type.name === 'tableHeader');

  return {
    hasHeaderRow,
    hasHeaderColumn
  };
}
