import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import type { Attachment } from '../types/report';
import { resolveAssetUrl } from '../utils/api';
import EditorToolbar from './EditorToolbar';

interface RichTextEditorProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onImageUpload: (file: File) => Promise<Attachment>;
  onEditorMessage: (message: string, tone?: 'info' | 'success' | 'error') => void;
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
      Table.configure({
        resizable: true
      }),
      TableRow,
      TableHeader,
      TableCell
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          'rich-editor min-h-[240px] max-w-none px-4 py-4 font-body text-[15px] leading-7 text-slate-700 focus:outline-none'
      },
      handlePaste(_view, event) {
        const items = Array.from(event.clipboardData?.items ?? []);
        const imageItem = items.find((item) => item.type.startsWith('image/'));

        if (!imageItem) {
          return false;
        }

        const file = imageItem.getAsFile();

        if (!file) {
          return false;
        }

        void handleImage(file);
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
