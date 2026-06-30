import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm',
          'placeholder:text-[var(--color-text-tertiary)]',
          'transition-colors duration-[120ms]',
          'focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40',
          'disabled:cursor-not-allowed disabled:bg-[var(--color-bg-subtle)] disabled:text-[var(--color-text-tertiary)]',
          'aria-[invalid=true]:border-danger',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
