import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import StatusBadge from './StatusBadge';

export interface DocumentCardData {
  id: string;
  uniqueId: string;
  project: string;
  sow: string;
  partner?: string;
  statusCode: string;
  activeStep?: string;
  submittedAt: string;
  approvers?: { name: string; initials: string }[];
  needsRouting?: boolean;
}

interface Props {
  doc: DocumentCardData;
  href: string;
  className?: string;
}

export default function DocumentCard({ doc, href, className }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        'block card p-4 transition-colors duration-[120ms]',
        'hover:bg-[var(--color-bg-subtle)] hover:border-[var(--color-border-strong)]',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        className,
      )}
    >
      {/* Header: Unique ID + StatusBadge */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-mono text-xs text-[var(--color-text-secondary)] tabular-nums">
          {doc.uniqueId}
        </span>
        <StatusBadge code={doc.statusCode} size="sm" />
      </div>

      {/* Project name */}
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] leading-snug line-clamp-2 mb-1.5">
        {doc.project}
      </h3>

      {/* SOW chip + Partner */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="inline-flex items-center rounded-sm bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)]">
          {doc.sow}
        </span>
        {doc.partner && (
          <span className="text-[11px] text-[var(--color-text-secondary)] truncate">
            {doc.partner}
          </span>
        )}
      </div>

      {/* Footer: avatar stack + step + date */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex -space-x-1.5">
          {(doc.approvers ?? []).slice(0, 4).map((a) => (
            <span
              key={a.name}
              title={a.name}
              className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-brand-surface)] text-[10px] font-semibold text-brand-ink ring-2 ring-white"
            >
              {a.initials}
            </span>
          ))}
        </div>

        <div className="text-right shrink-0">
          {doc.activeStep && (
            <p className="text-[11px] font-medium text-brand-ink">{doc.activeStep}</p>
          )}
          <p className="font-mono text-[11px] text-[var(--color-text-secondary)]">
            {doc.submittedAt}
          </p>
        </div>
      </div>
    </Link>
  );
}
