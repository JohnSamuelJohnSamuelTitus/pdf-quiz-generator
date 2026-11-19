import React, { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'outline' | 'default' | 'vice' | 'journal' | 'leather';
  size?: 'sm' | 'md';
}

export function Badge({ className, variant = 'neutral', size = 'sm', children, ...props }: BadgeProps) {
  const variants = {
    neutral: 'bg-[#30241B] text-[#D9C39B] border border-[#493522]',
    default: 'bg-[#30241B] text-[#D9C39B] border border-[#493522]',
    accent: 'bg-[#B18A4C]/15 text-[#C69B56] border border-[#B18A4C]/40 shadow-sm font-serif',
    vice: 'bg-[#B18A4C]/20 text-[#D9C39B] border border-[#B18A4C]/50 font-serif',
    journal: 'bg-[#30241B] text-[#B18A4C] border border-[#B18A4C] font-serif shadow-sm',
    leather: 'bg-[#1C1510] text-[#D9C39B] border border-[#3D2D21] font-serif',
    success: 'bg-[#1B291C] text-[#86EFAC] border border-[#2A472E]',
    warning: 'bg-[#3D2B15] text-[#FDE047] border border-[#61451F]',
    danger: 'bg-[#3B1A17] text-[#FCA5A5] border border-[#632722]',
    outline: 'border border-[#B18A4C]/30 text-[#D9C39B] bg-[#211A15]/60 font-serif'
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 font-medium rounded-md',
    md: 'text-xs px-2.5 py-1 font-medium rounded-md'
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
