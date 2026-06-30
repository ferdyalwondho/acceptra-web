import { ATP_STATUS, CATEGORY_CLASS } from '@/lib/status';
import { cn } from '@/lib/utils';

interface Props {
  code: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function StatusBadge({ code, size = 'md', className }: Props) {
  const status = ATP_STATUS[code];
  if (!status) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        CATEGORY_CLASS[status.category],
        className,
      )}
      title={status.label}
    >
      <span className="font-mono text-[10px] opacity-60 tabular-nums">{code}</span>
      {size === 'md' && <span>{status.label}</span>}
    </span>
  );
}
