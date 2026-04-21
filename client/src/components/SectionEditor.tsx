import type { Attachment } from '../types/report';
import RichTextEditor from './RichTextEditor';

interface SectionEditorProps {
  label: string;
  helper: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onImageUpload: (file: File) => Promise<Attachment>;
  onEditorMessage: (message: string, tone?: 'info' | 'success' | 'error') => void;
}

export default function SectionEditor({
  label,
  helper,
  placeholder,
  value,
  onChange,
  onImageUpload,
  onEditorMessage
}: SectionEditorProps) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-slate-900">{label}</h3>
        <p className="text-sm leading-6 text-slate-500">{helper}</p>
      </div>
      <RichTextEditor
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        onImageUpload={onImageUpload}
        onEditorMessage={onEditorMessage}
      />
    </section>
  );
}
