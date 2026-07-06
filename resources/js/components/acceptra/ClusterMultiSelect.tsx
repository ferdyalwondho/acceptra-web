import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClusterOption } from '@/types';

interface Props {
  options: ClusterOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

export default function ClusterMultiSelect({ options, selected, onChange }: Props) {
  const { t } = useTranslation();
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const containerRef        = useRef<HTMLDivElement>(null);
  const inputRef            = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOptions = useMemo(
    () => options.filter((o) => selected.includes(o.id)),
    [options, selected],
  );

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) =>
      o.name.toLowerCase().includes(needle) || o.province.toLowerCase().includes(needle),
    );
  }, [options, query]);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  function remove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== id));
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
        className={cn(
          'flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-sm border border-[var(--color-border-strong)] bg-white px-2 py-1.5 text-sm cursor-text',
          'focus-within:border-brand focus-within:ring-[3px] focus-within:ring-ring/40',
        )}
      >
        {selectedOptions.map((o) => (
          <span
            key={o.id}
            className="flex items-center gap-1 rounded-pill bg-brand-surface px-2 py-0.5 text-xs font-medium text-brand-ink"
          >
            {o.display_name}
            <button type="button" onClick={(e) => remove(o.id, e)} className="hover:text-danger">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <div className="flex min-w-[80px] flex-1 items-center gap-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-tertiary)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('cluster_multi_select.search_placeholder')}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-md">
          {filteredOptions.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--color-text-tertiary)]">
              {t('cluster_multi_select.no_results')}
            </p>
          ) : (
            filteredOptions.map((o) => {
              const isSelected = selected.includes(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle(o.id)}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-bg-subtle)]',
                    isSelected && 'bg-brand-surface/40',
                  )}
                >
                  <span>{o.display_name}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-brand-ink" />}
                </button>
              );
            })
          )}
        </div>
      )}

      {selectedOptions.length > 0 && (
        <p className="mt-1.5 text-xs text-[var(--color-text-tertiary)]">
          {t('cluster_multi_select.selected_count', { count: selectedOptions.length })}
        </p>
      )}
    </div>
  );
}
