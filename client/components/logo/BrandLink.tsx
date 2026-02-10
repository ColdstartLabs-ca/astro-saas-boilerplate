'use client';

import { cn } from '@client/utils/cn';
import { Logo } from './Logo';

interface IProps {
  className?: string;
  href?: string;
  variant?: 'full' | 'compact';
}

/**
 * Reusable Brand Link Component
 * Ensures consistent logo styling, hover effects, and drop shadows across the app.
 */
export function BrandLink({ className, href = '/', variant = 'full' }: IProps): JSX.Element {
  return (
    <a
      href={href}
      className={cn(
        "flex items-center cursor-pointer flex-shrink-0 transition-all duration-200",
        "hover:opacity-90 active:scale-95",
        "drop-shadow-[0_2px_8px_rgba(34,197,94,0.3)]",
        className
      )}
    >
      <Logo variant={variant} />
    </a>
  );
}
