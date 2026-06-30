import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'w-full rounded-sm border border-[var(--color-border-strong)] bg-white px-3 py-2 text-sm',
          'placeholder:text-[var(--color-text-tertiary)]',
          'transition-colors duration-[120ms]',
          'focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40',
          'disabled:cursor-not-allowed disabled:bg-[var(--color-bg-subtle)] disabled:text-[var(--color-text-tertiary)]',
          'aria-[invalid=true]:border-danger',
          'min-h-[80px] resize-y',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
