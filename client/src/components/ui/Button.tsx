import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'vice' | 'journal' | 'leather';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const variants = {
      primary:
        'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/25 focus:ring-indigo-500 border border-indigo-500/30',
      secondary:
        'bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 focus:ring-zinc-500',
      outline:
        'border border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white focus:ring-zinc-600 bg-transparent',
      ghost:
        'text-zinc-400 hover:bg-zinc-800 hover:text-white focus:ring-zinc-700',
      danger:
        'bg-rose-600 text-white hover:bg-rose-500 border border-rose-500 focus:ring-rose-500 shadow-sm',
      vice:
        'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/25 focus:ring-indigo-500 border border-indigo-500/30',
      journal:
        'bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700 focus:ring-zinc-500',
      leather:
        'bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-800 focus:ring-zinc-600'
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-6 py-2.5 gap-2.5'
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="inline-flex shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
