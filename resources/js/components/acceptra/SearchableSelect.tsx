import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface Props {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
}

export default function SearchableSelect({ options, value, onChange, placeholder, disabled, hasError }: Props) {
  const { t } = useTranslation();
  const [open, setOpen]         = useState(false);
  const [query, setQuery]       = useState('');
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef            = useRef<HTMLDivElement>(null);
  const dropdownRef             = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(() => options.find((o) => o.value === value), [options, value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
      setQuery('');
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dropdown is rendered in a portal (see below) so it can escape any ancestor
  // with `overflow-hidden` (e.g. the rounded-corner section cards on document
  // forms) — position it manually relative to the trigger instead of relying
  // on normal document flow.
  useLayoutEffect(() => {
    if (!open) return;
    function updatePosition() {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) =>
      o.label.toLowerCase().includes(needle) || (o.sublabel?.toLowerCase().includes(needle) ?? false),
    );
  }, [options, query]);

  function select(optionValue: string) {
    onChange(optionValue);
    setOpen(false);
    setQuery('');
  }

  function openDropdown() {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    requestAnimationFrame(() => inputRef.current?.select());
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={openDropdown}
        className={cn(
          'flex h-9 w-full items-center gap-1.5 rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm transition-colors duration-[120ms] cursor-text',
          'focus-within:border-brand focus-within:ring-[3px] focus-within:ring-ring/40',
          hasError && 'border-danger',
          disabled && 'cursor-not-allowed border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]',
        )}
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-tertiary)]" />
        <input
          ref={inputRef}
          type="text"
          value={open ? query : (selectedOption?.label ?? '')}
          onFocus={openDropdown}
          onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
          placeholder={placeholder}
          disabled={disabled}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
        />
        {!disabled && <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-tertiary)]" />}
      </div>

      {open && !disabled && position && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
          className="z-50 max-h-56 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-md"
        >
          {filteredOptions.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--color-text-tertiary)]">
              {t('searchable_select.no_results')}
            </p>
          ) : (
            filteredOptions.map((o) => {
              const isSelected = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => select(o.value)}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-bg-subtle)]',
                    isSelected && 'bg-brand-surface/40',
                  )}
                >
                  <span>{o.label}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-brand-ink" />}
                </button>
              );
            })
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
