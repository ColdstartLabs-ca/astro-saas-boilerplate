'use client';

import React from 'react';

interface IProps {
  className?: string;
  variant?: 'full' | 'compact';
}

export function Logo({ className = '', variant = 'full' }: IProps): JSX.Element {
  const isCompact = variant === 'compact';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Green square icon with white lightning bolt/arrow */}
      <svg
        width={isCompact ? '32' : '40'}
        height={isCompact ? '32' : '40'}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Green square background */}
        <rect width="40" height="40" rx="8" fill="#22c55e" />
        {/* White lightning bolt/arrow symbol */}
        <path
          d="M18 8L10 22H18L16 32L28 16H20L22 8H18Z"
          fill="white"
          stroke="white"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
      {/* AutopilotRank text */}
      {!isCompact && (
        <span className="text-white font-bold text-lg tracking-tight">
          Autopilot<span className="text-accent">Rank</span>
        </span>
      )}
    </div>
  );
}
