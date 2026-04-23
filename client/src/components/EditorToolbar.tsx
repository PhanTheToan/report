import type { Editor } from '@tiptap/react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
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
import { getSelectedColumnWidth, getTableHeaderState, setSelectedColumnWidth } from '../utils/tableEditor';

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

interface ToolbarChipButtonProps extends ToolbarButtonProps {
  meta?: string;
}

const COLUMN_WIDTH_OPTIONS = [
  { label: 'Tự do', width: null, description: 'Giữ theo kéo thả.' },
  { label: 'Hẹp', width: 120, description: '120px' },
  { label: 'Vừa', width: 160, description: '160px' },
  { label: 'Rộng', width: 220, description: '220px' },
  { label: 'Rất rộng', width: 300, description: '300px' }
] as const;

function getToolbarButtonClass(active: boolean, disabled: boolean, tone: 'default' | 'danger') {
  const inactiveClass =
    tone === 'danger'
      ? 'border-rose-200 bg-white text-rose-600 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700'
      : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700';

  return `inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 ${
    active ? 'border-sky-700 bg-sky-700 text-white shadow-sm' : inactiveClass
  } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`;
}

function getToolbarChipButtonClass(active: boolean, disabled: boolean, tone: 'default' | 'danger') {
  const inactiveClass =
    tone === 'danger'
      ? 'border-rose-200 bg-white text-rose-600 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700'
      : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700';

  return `inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 ${
    active ? 'border-sky-700 bg-sky-700 text-white shadow-sm' : inactiveClass
  } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`;
}

function ToolbarButton({ active = false, disabled = false, label, onClick, tone = 'default', children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={getToolbarButtonClass(active, disabled, tone)}
    >
      {children}
    </button>
  );
}

function ToolbarChipButton({
  active = false,
  disabled = false,
  label,
  meta,
  onClick,
  tone = 'default',
  children
}: ToolbarChipButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={getToolbarChipButtonClass(active, disabled, tone)}
    >
      <span className="inline-flex h-4 w-4 items-center justify-center">{children}</span>
      <span className="text-sm font-medium">{label}</span>
      {meta ? <span className={`text-xs ${active ? 'text-white/80' : 'text-slate-400'}`}>{meta}</span> : null}
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

function useDismissablePopover() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return {
    isOpen,
    setIsOpen,
    containerRef
  };
}

function PopoverPanel({
  title,
  description,
  widthClass = 'w-[320px]',
  children
}: {
  title: string;
  description?: string;
  widthClass?: string;
  children: ReactNode;
}) {
  return (
    <div className={`absolute left-0 top-full z-30 mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl ${widthClass}`}>
      <div className="space-y-1 border-b border-slate-100 pb-3">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        {description ? <p className="text-xs leading-5 text-slate-500">{description}</p> : null}
      </div>
      <div className="pt-3">{children}</div>
    </div>
  );
}

function TableInsertPicker({ active, onSelect }: { active: boolean; onSelect: (rows: number, cols: number, withHeaderRow: boolean) => void }) {
  const { isOpen, setIsOpen, containerRef } = useDismissablePopover();
  const [hoverSize, setHoverSize] = useState({ rows: 4, cols: 4 });
  const [withHeaderRow, setWithHeaderRow] = useState(true);
  const maxRows = 8;
  const maxCols = 8;

  return (
    <div ref={containerRef} className="relative">
      <ToolbarChipButton active={active || isOpen} label="Chèn bảng" meta={`${hoverSize.rows}×${hoverSize.cols}`} onClick={() => setIsOpen((current) => !current)}>
        <Table2 className="h-4 w-4" />
      </ToolbarChipButton>

      {isOpen ? (
        <PopoverPanel title="Chèn bảng" widthClass="w-[320px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Kích thước</span>
            <span className="text-sm font-semibold text-slate-700">
              {hoverSize.rows} hàng x {hoverSize.cols} cột
            </span>
          </div>

          <div className="mt-3 grid grid-cols-8 gap-1.5 rounded-2xl bg-slate-50 p-2">
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
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHoverSize({ rows, cols })}
                    onFocus={() => setHoverSize({ rows, cols })}
                    onClick={() => {
                      onSelect(rows, cols, withHeaderRow);
                      setIsOpen(false);
                    }}
                    className={`h-7 w-7 rounded-[10px] border transition-colors ${
                      highlighted ? 'border-sky-600 bg-sky-600 shadow-sm' : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50'
                    }`}
                  />
                );
              })
            )}
          </div>

          <div className="mt-4 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Heading</span>
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setWithHeaderRow(true)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  withHeaderRow ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Có dòng tiêu đề
              </button>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setWithHeaderRow(false)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  !withHeaderRow ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Không có tiêu đề
              </button>
            </div>
          </div>
        </PopoverPanel>
      ) : null}
    </div>
  );
}

function TableHeaderPicker({
  editor,
  hasHeaderRow,
  hasHeaderColumn
}: {
  editor: Editor;
  hasHeaderRow: boolean;
  hasHeaderColumn: boolean;
}) {
  const { isOpen, setIsOpen, containerRef } = useDismissablePopover();
  const hasAnyHeader = hasHeaderRow || hasHeaderColumn || editor.isActive('tableHeader');

  const headerOptions = [
    {
      key: 'row',
      label: 'Dòng đầu',
      description: 'Heading hàng đầu.',
      active: hasHeaderRow,
      onClick: () => editor.chain().focus().toggleHeaderRow().run()
    },
    {
      key: 'column',
      label: 'Cột đầu',
      description: 'Heading cột đầu.',
      active: hasHeaderColumn,
      onClick: () => editor.chain().focus().toggleHeaderColumn().run()
    },
    {
      key: 'cell',
      label: 'Ô hiện tại',
      description: 'Heading ô đang chọn.',
      active: editor.isActive('tableHeader'),
      onClick: () => editor.chain().focus().toggleHeaderCell().run()
    }
  ] as const;

  return (
    <div ref={containerRef} className="relative">
      <ToolbarChipButton active={hasAnyHeader || isOpen} label="Heading" onClick={() => setIsOpen((current) => !current)}>
        <Rows3 className="h-4 w-4" />
      </ToolbarChipButton>

      {isOpen ? (
        <PopoverPanel title="Heading">
          <div className="space-y-2">
            {headerOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  option.onClick();
                  setIsOpen(false);
                }}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                  option.active ? 'border-sky-300 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50'
                }`}
              >
                <div className="text-sm font-semibold">{option.label}</div>
                <div className={`mt-1 text-xs leading-5 ${option.active ? 'text-sky-700' : 'text-slate-500'}`}>{option.description}</div>
              </button>
            ))}
          </div>
        </PopoverPanel>
      ) : null}
    </div>
  );
}

function ColumnWidthPicker({
  editor,
  currentWidth
}: {
  editor: Editor;
  currentWidth: number | null;
}) {
  const { isOpen, setIsOpen, containerRef } = useDismissablePopover();

  return (
    <div ref={containerRef} className="relative">
      <ToolbarChipButton
        active={isOpen}
        label="Độ rộng cột"
        meta={currentWidth ? `${currentWidth}px` : 'Tự do'}
        onClick={() => setIsOpen((current) => !current)}
      >
        <ArrowLeftRight className="h-4 w-4" />
      </ToolbarChipButton>

      {isOpen ? (
        <PopoverPanel title="Độ rộng cột" description="Chọn ô trong cột cần đổi.">
          <div className="grid gap-2">
            {COLUMN_WIDTH_OPTIONS.map((option) => {
              const isActive = currentWidth === option.width || (!currentWidth && option.width === null);

              return (
                <button
                  key={option.label}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setSelectedColumnWidth(editor, option.width);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                    isActive ? 'border-sky-300 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50'
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold">{option.label}</div>
                    <div className={`mt-1 text-xs leading-5 ${isActive ? 'text-sky-700' : 'text-slate-500'}`}>{option.description}</div>
                  </div>
                  <span className={`text-xs font-semibold ${isActive ? 'text-sky-700' : 'text-slate-400'}`}>
                    {option.width ? `${option.width}px` : 'Auto'}
                  </span>
                </button>
              );
            })}
          </div>
        </PopoverPanel>
      ) : null}
    </div>
  );
}

export default function EditorToolbar({ editor, isUploading, onPickImage }: EditorToolbarProps) {
  const insideTable = editor.isActive('table');
  const currentTableScale = getClampedTableScale(Number(editor.getAttributes('table').scale) || 100);
  const currentColumnWidth = insideTable ? getSelectedColumnWidth(editor) : null;
  const headerState = insideTable ? getTableHeaderState(editor) : { hasHeaderRow: false, hasHeaderColumn: false };

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
    <div className="relative z-20 flex flex-wrap items-start gap-2 border-b border-slate-200 px-4 py-3">
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
        onSelect={(rows, cols, withHeaderRow) => {
          editor.chain().focus().insertTable({ rows, cols, withHeaderRow }).run();
        }}
      />

      {insideTable ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 px-2 py-2">
          <span className="px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Bảng đang chọn</span>

          <TableHeaderPicker editor={editor} hasHeaderRow={headerState.hasHeaderRow} hasHeaderColumn={headerState.hasHeaderColumn} />
          <ColumnWidthPicker editor={editor} currentWidth={currentColumnWidth} />

          <ToolbarChipButton label="Thêm cột" onClick={() => editor.chain().focus().addColumnAfter().run()}>
            <Columns3 className="h-4 w-4" />
          </ToolbarChipButton>
          <ToolbarChipButton label="Thêm hàng" onClick={() => editor.chain().focus().addRowAfter().run()}>
            <Rows3 className="h-4 w-4" />
          </ToolbarChipButton>
          <ToolbarChipButton label="Thu bảng" meta="-10%" onClick={() => updateTableScale(-10)}>
            <ResizeTableIcon direction="down" />
          </ToolbarChipButton>
          <ToolbarChipButton label="Phóng bảng" meta="+10%" onClick={() => updateTableScale(10)}>
            <ResizeTableIcon direction="up" />
          </ToolbarChipButton>

          <div className="inline-flex min-w-[84px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 leading-none shadow-sm">
            <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-slate-400">Tỷ lệ</span>
            <span className="mt-1 text-[11px] font-semibold text-slate-700">{currentTableScale}%</span>
          </div>

          <ToolbarChipButton label="Xóa cột" onClick={() => editor.chain().focus().deleteColumn().run()} tone="danger">
            <RemoveTableIcon>
              <Columns3 className="h-4 w-4" />
            </RemoveTableIcon>
          </ToolbarChipButton>
          <ToolbarChipButton label="Xóa hàng" onClick={() => editor.chain().focus().deleteRow().run()} tone="danger">
            <RemoveTableIcon>
              <Rows3 className="h-4 w-4" />
            </RemoveTableIcon>
          </ToolbarChipButton>
          <ToolbarChipButton label="Xóa bảng" onClick={() => editor.chain().focus().deleteTable().run()} tone="danger">
            <Trash2 className="h-4 w-4" />
          </ToolbarChipButton>
        </div>
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
