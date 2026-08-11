import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';

interface Props {
  url: string | null;
  className?: string;
}

/**
 * Renders a PDF using the browser's own built-in viewer (Chrome/Edge/Firefox/Safari
 * all ship one) instead of rasterizing pages ourselves onto canvases. This trades away
 * the custom zoom controls and the TTD/Nama placement overlay, but gets native zoom,
 * pan, page navigation, search, and print for free — and it never pixelates on zoom,
 * since the browser plugin isn't limited by a fixed-resolution canvas backing store.
 */
export default function PdfViewer({ url, className }: Props) {
  if (!url) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center rounded-lg border-2 border-dashed',
        'border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)] py-16 text-center',
        className,
      )}>
        <FileText className="mb-3 h-10 w-10 text-[var(--color-text-tertiary)]" />
        <p className="text-sm text-[var(--color-text-secondary)]">Tidak ada PDF terlampir</p>
      </div>
    );
  }

  return (
    <iframe
      src={url}
      title="PDF preview"
      className={cn(
        'min-h-[70vh] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)]',
        className,
      )}
    />
  );
}
