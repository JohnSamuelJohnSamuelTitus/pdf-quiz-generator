import React, { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'outline' | 'default' | 'vice' | 'journal' | 'leather';
  size?: 'sm' | 'md';
}

export function Badge({ className, variant = 'neutral', size = 'sm', children, ...props }: BadgeProps) {
  const variants = {
    neutral: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
    default: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
    accent: 'bg-indigo-950/60 text-indigo-300 border border-indigo-700/60 shadow-sm',
    vice: 'bg-indigo-950/60 text-indigo-300 border border-indigo-700/60',
    journal: 'bg-zinc-800 text-zinc-200 border border-zinc-700',
    leather: 'bg-zinc-900 text-zinc-300 border border-zinc-800',
    success: 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60',
    warning: 'bg-amber-950/60 text-amber-300 border border-amber-800/60',
    danger: 'bg-rose-950/60 text-rose-300 border border-rose-800/60',
    outline: 'border border-zinc-700 text-zinc-300 bg-zinc-900/40'
  };

  const sizes = {
    sm: 'text-[11px] px-2.5 py-0.5 font-medium rounded-md',
    md: 'text-xs px-3 py-1 font-medium rounded-md'
  };

  return (
    <div
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1 font-medium select-none tracking-tight transition-colors',
          variants[variant],
          sizes[size],
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
}
