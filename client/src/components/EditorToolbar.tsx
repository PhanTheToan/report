import type { Editor } from '@tiptap/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  ArrowLeftRight,
  Bold,
  Code2,
  Columns3,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  MessageSquareQuote,
  Minus,
  Redo2,
  Rows3,
  Table2,
  Trash2,
  Undo2
} from 'lucide-react';
import { getClampedTableScale } from '../extensions/ScaledTable';

interface EditorToolbarProps {
  editor: Editor;
  isUploading: boolean;
  onPickImage: () => void;
}

interface ToolbarButtonProps {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
  children: ReactNode;
}

function getToolbarButtonClass(active: boolean, disabled: boolean, tone: 'default' | 'danger') {
  const inactiveClass =
    tone === 'danger'
      ? 'border-rose-200 bg-white text-rose-600 hover:border-rose-400 hover:text-rose-700'
      : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700';

  return `inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 ${
    active ? 'border-sky-700 bg-sky-700 text-white' : inactiveClass
  } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`;
}

function ToolbarButton({ active = false, disabled = false, label, onClick, tone = 'default', children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={getToolbarButtonClass(active, disabled, tone)}
    >
      {children}
    </button>
  );
}

function RemoveTableIcon({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex h-4 w-4 items-center justify-center">
      {children}
      <Minus className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-white" />
    </span>
  );
}

function ResizeTableIcon({ direction }: { direction: 'down' | 'up' }) {
  return (
    <span className="relative inline-flex h-4 w-4 items-center justify-center">
      <ArrowLeftRight className="h-4 w-4" />
      <span className="absolute -bottom-1 -right-1 text-[10px] font-bold leading-none">{direction === 'up' ? '+' : '-'}</span>
    </span>
  );
}

function TableInsertPicker({ active, onSelect }: { active: boolean; onSelect: (rows: number, cols: number) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverSize, setHoverSize] = useState({ rows: 3, cols: 3 });
  const maxRows = 6;
  const maxCols = 6;

  function resetPreview() {
    setHoverSize({ rows: 3, cols: 3 });
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => {
        setIsOpen(false);
        resetPreview();
      }}
    >
      <button
        type="button"
        aria-label="Chèn bảng"
        title="Chèn bảng"
        onClick={() => setIsOpen((current) => !current)}
        className={getToolbarButtonClass(active || isOpen, false, 'default')}
      >
        <Table2 className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-full z-20 mt-2 w-[196px] rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">Kích thước</span>
            <span className="text-xs font-semibold text-slate-600">
              {hoverSize.rows} x {hoverSize.cols}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-6 gap-1">
            {Array.from({ length: maxRows }, (_, rowIndex) =>
              Array.from({ length: maxCols }, (_, colIndex) => {
                const rows = rowIndex + 1;
                const cols = colIndex + 1;
                const highlighted = rows <= hoverSize.rows && cols <= hoverSize.cols;

                return (
                  <button
                    key={`${rows}-${cols}`}
                    type="button"
                    aria-label={`Chèn bảng ${rows} x ${cols}`}
                    title={`${rows} x ${cols}`}
                    onMouseEnter={() => setHoverSize({ rows, cols })}
                    onFocus={() => setHoverSize({ rows, cols })}
                    onClick={() => {
                      onSelect(rows, cols);
                      setIsOpen(false);
                      setHoverSize({ rows, cols });
                    }}
                    className={`h-6 w-6 rounded-md border transition-colors ${
                      highlighted ? 'border-sky-600 bg-sky-600' : 'border-slate-200 bg-slate-50 hover:border-sky-300 hover:bg-sky-50'
                    }`}
                  />
                );
              })
            )}
          </div>
          <p className="mt-3 text-[11px] leading-4 text-slate-400">Di chuột để chọn kích thước, sau đó bấm để chèn.</p>
        </div>
      ) : null}
    </div>
  );
}

export default function EditorToolbar({ editor, isUploading, onPickImage }: EditorToolbarProps) {
  const insideTable = editor.isActive('table');
  const currentTableScale = getClampedTableScale(Number(editor.getAttributes('table').scale) || 100);

  function updateTableScale(delta: number) {
    editor
      .chain()
      .focus()
      .updateAttributes('table', {
        scale: getClampedTableScale(currentTableScale + delta)
      })
      .run();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
      <ToolbarButton label="In đậm" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="In nghiêng" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Danh sách chấm" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Danh sách số" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Trích dẫn" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <MessageSquareQuote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Khối mã" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <Code2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Chèn ảnh" disabled={isUploading} onClick={onPickImage}>
        <ImagePlus className="h-4 w-4" />
      </ToolbarButton>
      <TableInsertPicker
        active={insideTable}
        onSelect={(rows, cols) => {
          editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
        }}
      />
      {insideTable ? (
        <>
          <ToolbarButton label="Thêm cột" onClick={() => editor.chain().focus().addColumnAfter().run()}>
            <Columns3 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Thêm hàng" onClick={() => editor.chain().focus().addRowAfter().run()}>
            <Rows3 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Thu nhỏ bảng" onClick={() => updateTableScale(-10)}>
            <ResizeTableIcon direction="down" />
          </ToolbarButton>
          <ToolbarButton label="Phóng to bảng" onClick={() => updateTableScale(10)}>
            <ResizeTableIcon direction="up" />
          </ToolbarButton>
          <div className="inline-flex min-w-[78px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 leading-none">
            <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-slate-400">Bảng</span>
            <span className="mt-1 text-[11px] font-semibold text-slate-600">{currentTableScale}%</span>
          </div>
          <ToolbarButton label="Xóa cột" onClick={() => editor.chain().focus().deleteColumn().run()} tone="danger">
            <RemoveTableIcon>
              <Columns3 className="h-4 w-4" />
            </RemoveTableIcon>
          </ToolbarButton>
          <ToolbarButton label="Xóa hàng" onClick={() => editor.chain().focus().deleteRow().run()} tone="danger">
            <RemoveTableIcon>
              <Rows3 className="h-4 w-4" />
            </RemoveTableIcon>
          </ToolbarButton>
          <ToolbarButton label="Xóa bảng" onClick={() => editor.chain().focus().deleteTable().run()} tone="danger">
            <Trash2 className="h-4 w-4" />
          </ToolbarButton>
        </>
      ) : null}
      <div className="ml-auto flex items-center gap-2">
        <ToolbarButton label="Hoàn tác" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Làm lại" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
      </div>
    </div>
  );
}
