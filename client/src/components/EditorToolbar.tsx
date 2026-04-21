import type { Editor } from '@tiptap/react';
import type { ReactNode } from 'react';
import {
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

function ToolbarButton({ active, disabled, label, onClick, tone = 'default', children }: ToolbarButtonProps) {
  const inactiveClass =
    tone === 'danger'
      ? 'border-rose-200 bg-white text-rose-600 hover:border-rose-400 hover:text-rose-700'
      : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700';

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 ${
        active
          ? 'border-sky-700 bg-sky-700 text-white'
          : inactiveClass
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
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

export default function EditorToolbar({ editor, isUploading, onPickImage }: EditorToolbarProps) {
  const insideTable = editor.isActive('table');

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
      <ToolbarButton label="In đậm" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="In nghiêng" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Danh sách chấm"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Danh sách số"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Trích dẫn"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <MessageSquareQuote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Khối mã"
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Chèn ảnh" disabled={isUploading} onClick={onPickImage}>
        <ImagePlus className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Chèn bảng"
        active={insideTable}
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        <Table2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Thêm cột" disabled={!insideTable} onClick={() => editor.chain().focus().addColumnAfter().run()}>
        <Columns3 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Thêm hàng" disabled={!insideTable} onClick={() => editor.chain().focus().addRowAfter().run()}>
        <Rows3 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Xóa cột" disabled={!insideTable} onClick={() => editor.chain().focus().deleteColumn().run()} tone="danger">
        <RemoveTableIcon>
          <Columns3 className="h-4 w-4" />
        </RemoveTableIcon>
      </ToolbarButton>
      <ToolbarButton label="Xóa hàng" disabled={!insideTable} onClick={() => editor.chain().focus().deleteRow().run()} tone="danger">
        <RemoveTableIcon>
          <Rows3 className="h-4 w-4" />
        </RemoveTableIcon>
      </ToolbarButton>
      <ToolbarButton label="Xóa bảng" disabled={!insideTable} onClick={() => editor.chain().focus().deleteTable().run()} tone="danger">
        <Trash2 className="h-4 w-4" />
      </ToolbarButton>
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
