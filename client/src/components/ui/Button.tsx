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
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const variants = {
      primary:
        'bg-gradient-to-b from-[#C69B56] to-[#B18A4C] text-[#211A15] font-serif font-bold uppercase tracking-wider border border-[#D9C39B] hover:brightness-110 shadow-gold-glow focus:ring-[#B18A4C]',
      secondary:
        'bg-[#30241B] text-[#F5EBD8] border border-[#B18A4C]/60 hover:bg-[#493522] hover:border-[#C69B56] focus:ring-[#B18A4C]',
      outline:
        'border border-[#B18A4C]/40 text-[#D9C39B] hover:bg-[#30241B] hover:border-[#B18A4C] hover:text-[#F5EBD8] focus:ring-[#B18A4C] bg-transparent',
      ghost:
        'text-[#D9C39B] hover:bg-[#30241B] hover:text-[#F5EBD8] focus:ring-[#B18A4C]',
      danger:
        'bg-[#7A251E] text-[#F5EBD8] hover:bg-[#912D25] border border-[#A63A31] focus:ring-[#7A251E] shadow-subtle',
      vice:
        'bg-gradient-to-b from-[#C69B56] to-[#B18A4C] text-[#211A15] font-serif font-bold uppercase tracking-wider border border-[#D9C39B] hover:brightness-110 shadow-gold-glow focus:ring-[#B18A4C]',
      journal:
        'bg-[#D9C39B] text-[#30251B] font-serif font-bold tracking-wide border border-[#B18A4C] hover:bg-[#F0E4C9] shadow-subtle focus:ring-[#B18A4C]',
      leather:
        'bg-[#30241B] text-[#F5EBD8] font-serif tracking-wide border border-[#B18A4C] hover:bg-[#493522] shadow-leather focus:ring-[#B18A4C]'
    };

    const sizes = {
      sm: 'text-xs px-2.5 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-5 py-2.5 gap-2.5'
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
