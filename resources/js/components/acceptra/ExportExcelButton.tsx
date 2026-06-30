import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export default function ExportExcelButton({ href, onClick, disabled, className, label = 'Export to Excel' }: Props) {
  const base = cn(
    'inline-flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium',
    'border border-ming/40 bg-white text-ming',
    'transition-colors duration-[120ms] hover:bg-ming-surface',
    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
    'disabled:opacity-50 disabled:pointer-events-none',
    className,
  );

  if (href) {
    return (
      <a href={href} className={base} download>
        <Download className="h-4 w-4" />
        {label}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={base}>
      <Download className="h-4 w-4" />
      {label}
    </button>
  );
}
