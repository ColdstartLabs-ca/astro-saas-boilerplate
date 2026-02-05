'use client';

import type React from 'react';

interface IProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function DashboardButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: IProps): JSX.Element {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-main focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed";

  const variants: Record<string, string> = {
    primary: "bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/20 border border-transparent",
    secondary: "bg-white text-main hover:bg-white/90 border border-transparent",
    outline: "bg-transparent border border-border text-secondary hover:bg-surface-light",
    ghost: "bg-transparent text-secondary hover:text-white hover:bg-surface-light/50"
  };

  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-8 py-3.5 text-lg"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
