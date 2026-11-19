import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ProgressBarProps {
  value: number; // 0 - 100
  max?: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
  color?: 'indigo' | 'emerald' | 'amber' | 'slate';
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  className,
  color = 'indigo'
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const colors = {
    indigo: 'bg-indigo-600 dark:bg-indigo-500',
    emerald: 'bg-emerald-600 dark:bg-emerald-500',
    amber: 'bg-amber-500 dark:bg-amber-400',
    slate: 'bg-slate-800 dark:bg-slate-200'
  };

  return (
    <div className={twMerge('w-full space-y-1.5', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400 font-medium">
          {label && <span>{label}</span>}
          {showPercentage && <span className="tabular-nums font-semibold">{percentage}%</span>}
        </div>
      )}
      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={twMerge(clsx('h-full transition-all duration-300 ease-out rounded-full', colors[color]))}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
