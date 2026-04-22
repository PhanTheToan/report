import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import StarterKit from '@tiptap/starter-kit';
import { TextSelection } from '@tiptap/pm/state';
import { TableMap, cellAround, findTable } from '@tiptap/pm/tables';
import type { EditorView } from '@tiptap/pm/view';
import type { Attachment } from '../types/report';
import { ScaledTable } from '../extensions/ScaledTable';
import { resolveAssetUrl } from '../utils/api';
import { buildTableHtmlFromRows, parseClipboardTableText } from '../utils/tablePaste';
import EditorToolbar from './EditorToolbar';

interface RichTextEditorProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onImageUpload: (file: File) => Promise<Attachment>;
  onEditorMessage: (message: string, tone?: 'info' | 'success' | 'error') => void;
}

type TableCellJson = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: Array<Record<string, unknown>>;
};

type TableRowJson = {
  type: 'tableRow';
  content: TableCellJson[];
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildParagraphs(text: string) {
  const lines = text.replace(/\r/g, '').split('\n');

  if (lines.length === 0) {
    return [{ type: 'paragraph' }];
  }

  return lines.map((line) =>
    line.length > 0
      ? {
          type: 'paragraph',
          content: [{ type: 'text', text: line }]
        }
      : { type: 'paragraph' }
  );
}

function createEmptyCell(type: string) {
  return {
    type,
    content: [{ type: 'paragraph' }]
  };
}

function createTextCell(baseCell: TableCellJson | undefined, text: string, fallbackType: string): TableCellJson {
  return {
    type: baseCell?.type ?? fallbackType,
    attrs: baseCell?.attrs ? cloneJson(baseCell.attrs) : undefined,
    content: buildParagraphs(text)
  };
}

function replaceTableContent(view: EditorView, rows: string[][]) {
  const { state } = view;
  const table = findTable(state.selection.$from);
  const anchorCell = cellAround(state.selection.$from);

  if (!table || !anchorCell || rows.length === 0 || rows[0]?.length === 0) {
    return false;
  }

  const map = TableMap.get(table.node);
  const anchorRect = map.findCell(anchorCell.pos - table.start);
  const tableJson = table.node.toJSON();
  const existingRows = Array.isArray(tableJson.content) ? (tableJson.content as TableRowJson[]) : [];
  const existingRowCount = existingRows.length;
  const existingColCount = existingRows.reduce((max, row) => Math.max(max, row.content?.length ?? 0), 0);
  const nextRowCount = Math.max(existingRowCount, anchorRect.top + rows.length);
  const nextColCount = Math.max(existingColCount, anchorRect.left + rows[0].length);
  const hasHeaderRow = existingRows[0]?.content?.every((cell) => cell.type === 'tableHeader') ?? false;

  const normalizedRows: TableRowJson[] = Array.from({ length: nextRowCount }, (_, rowIndex) => {
    const existingCells = Array.isArray(existingRows[rowIndex]?.content) ? cloneJson(existingRows[rowIndex].content) : [];
    const fallbackType = existingCells.find(Boolean)?.type ?? (hasHeaderRow && rowIndex === 0 ? 'tableHeader' : 'tableCell');

    return {
      type: 'tableRow',
      content: Array.from({ length: nextColCount }, (_, colIndex) => cloneJson(existingCells[colIndex] ?? createEmptyCell(fallbackType)))
    };
  });

  rows.forEach((row, rowOffset) => {
    row.forEach((value, colOffset) => {
      const targetRowIndex = anchorRect.top + rowOffset;
      const targetColIndex = anchorRect.left + colOffset;
      const targetCell = normalizedRows[targetRowIndex].content[targetColIndex];
      const fallbackType = targetCell?.type ?? (hasHeaderRow && targetRowIndex === 0 ? 'tableHeader' : 'tableCell');

      normalizedRows[targetRowIndex].content[targetColIndex] = createTextCell(targetCell, value, fallbackType);
    });
  });

  const nextTableNode = state.schema.nodeFromJSON({
    type: table.node.type.name,
    attrs: cloneJson(tableJson.attrs ?? {}),
    content: normalizedRows
  });
  const nextMap = TableMap.get(nextTableNode);
  const nextCellPos = table.start + nextMap.positionAt(anchorRect.top, anchorRect.left, nextTableNode);
  const tr = state.tr.replaceWith(table.pos, table.pos + table.node.nodeSize, nextTableNode);
  const resolvedSelectionPos = Math.min(nextCellPos + 1, tr.doc.content.size);

  tr.setSelection(TextSelection.near(tr.doc.resolve(resolvedSelectionPos)));
  view.dispatch(tr.scrollIntoView());
  return true;
}

export default function RichTextEditor({
  value,
  placeholder,
  onChange,
  onImageUpload,
  onEditorMessage
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleImage(file: File) {
    if (!file.type.startsWith('image/')) {
      onEditorMessage('Chỉ hỗ trợ tải lên file ảnh.', 'error');
      return;
    }

    try {
      setIsUploading(true);
      onEditorMessage(`Đang tải lên ${file.name}...`);
      const attachment = await onImageUpload(file);
      editor?.chain().focus().setImage({ src: resolveAssetUrl(attachment.url), alt: attachment.originalName }).run();
      onEditorMessage(`Đã chèn ảnh ${attachment.originalName}.`, 'success');
    } catch (error) {
      onEditorMessage(error instanceof Error ? error.message : 'Không thể tải ảnh lên.', 'error');
    } finally {
      setIsUploading(false);
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        allowBase64: false
      }),
      Placeholder.configure({
        placeholder
      }),
      ScaledTable.configure({
        resizable: true
      }),
      TableRow,
      TableHeader,
      TableCell
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'rich-editor min-h-[240px] max-w-none px-4 py-4 font-body text-[15px] leading-7 text-slate-700 focus:outline-none'
      },
      handlePaste(view, event) {
        const items = Array.from(event.clipboardData?.items ?? []);
        const imageItem = items.find((item) => item.type.startsWith('image/'));

        if (imageItem) {
          const file = imageItem.getAsFile();

          if (!file) {
            return false;
          }

          void handleImage(file);
          event.preventDefault();
          return true;
        }

        const tabSeparatedText = event.clipboardData?.getData('text/tab-separated-values') || '';
        const csvText = event.clipboardData?.getData('text/csv') || '';
        const plainText = event.clipboardData?.getData('text/plain') || '';
        const clipboardText = tabSeparatedText || csvText || plainText;
        const parsedRows = parseClipboardTableText(clipboardText, {
          allowSingleLine: Boolean(tabSeparatedText || csvText)
        });

        if (!parsedRows) {
          return false;
        }

        if (editor?.isActive('table')) {
          const replaced = replaceTableContent(view, parsedRows);

          if (replaced) {
            event.preventDefault();
            return true;
          }

          return false;
        }

        const tableHtml = buildTableHtmlFromRows(parsedRows);

        if (!tableHtml) {
          return false;
        }

        editor?.chain().focus().insertContent(tableHtml).run();
        event.preventDefault();
        return true;
      }
    },
    onUpdate({ editor: currentEditor }) {
      onChange(currentEditor.getHTML());
    }
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (editor.getHTML() !== value) {
      editor.commands.setContent(value, false);
    }
  }, [editor, value]);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
      {editor ? <EditorToolbar editor={editor} isUploading={isUploading} onPickImage={() => fileInputRef.current?.click()} /> : null}
      <EditorContent editor={editor} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            void handleImage(file);
          }

          event.target.value = '';
        }}
      />
    </div>
  );
}
