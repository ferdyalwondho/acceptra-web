import { useRef, useState } from 'react';
import { FileText, FileSpreadsheet, X, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

type FileType = 'pdf' | 'excel';

interface Props {
  type: FileType;
  value?: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
  className?: string;
}

const CONFIG = {
  pdf: {
    accept: 'application/pdf',
    label: 'Upload PDF',
    hint: 'PDF, maks 25 MB',
    icon: FileText,
    iconColor: 'text-red-500',
    maxMb: 25,
  },
  excel: {
    accept: '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel',
    label: 'Lampiran Excel (opsional, view-only)',
    hint: 'XLSX / XLS, maks 10 MB',
    icon: FileSpreadsheet,
    iconColor: 'text-green-600',
    maxMb: 10,
  },
};

export default function FileUpload({ type, value, onChange, required, className }: Props) {
  const config = CONFIG[type];
  const Icon = config.icon;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(file: File): string | null {
    if (file.size > config.maxMb * 1024 * 1024) return `Ukuran file melebihi ${config.maxMb} MB`;
    if (type === 'pdf' && file.type !== 'application/pdf') return 'Hanya file PDF yang diperbolehkan';
    return null;
  }

  function handleFile(file: File) {
    const err = validate(file);
    if (err) { setError(err); return; }
    setError(null);
    onChange(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  if (value) {
    return (
      <div className={cn('flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3', className)}>
        <Icon className={cn('h-8 w-8 shrink-0', config.iconColor)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{value.name}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">{(value.size / 1024 / 1024).toFixed(1)} MB</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors"
          aria-label="Hapus file"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer',
          'transition-colors duration-[120ms]',
          'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
          dragOver
            ? 'border-brand bg-[var(--color-brand-surface)]'
            : 'border-[var(--color-border-strong)] bg-white hover:border-brand hover:bg-[var(--color-brand-surface)]/30',
        )}
      >
        <UploadCloud className={cn('h-8 w-8', dragOver ? 'text-brand-ink' : 'text-[var(--color-text-tertiary)]')} />
        <div className="text-center">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">{config.label}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">{config.hint}</p>
          {required && <p className="text-xs text-danger mt-0.5">* Wajib</p>}
        </div>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={config.accept}
        className="sr-only"
        onChange={handleChange}
      />
    </div>
  );
}
