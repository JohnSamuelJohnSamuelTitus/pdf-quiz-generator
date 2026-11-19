import React, { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge(
        clsx(
          'animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-800',
          className
        )
      )}
      {...props}
    />
  );
}
