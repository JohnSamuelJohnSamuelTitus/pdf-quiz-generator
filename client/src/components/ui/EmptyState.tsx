import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className
}: EmptyStateProps) {
  return (
    <div
      className={twMerge(
        clsx(
          'flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-[#493522] bg-[#281F19]/60',
          className
        )
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-[#1C1510] border border-[#493522] flex items-center justify-center text-[#C69B56] mb-3 shadow-gold-glow">
          {icon}
        </div>
      )}
      <h4 className="text-sm font-serif font-bold text-[#F5EBD8] mb-1">{title}</h4>
      <p className="text-xs font-serif text-[#D9C39B]/70 max-w-sm mb-4 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" variant="outline" onClick={onAction} className="border-[#B18A4C]/50 hover:border-[#B18A4C] text-[#F5EBD8]">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
