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
      <div className="bg-secondary p-1.5 rounded-lg">
        <svg
          width="20"
          height="20"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="flex-shrink-0"
        >
          {/* White lightning bolt/arrow symbol */}
          <path
            d="M18 8L10 22H18L16 32L28 16H20L22 8H18Z"
            fill="white"
            stroke="white"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {/* AutopilotRank text */}
      {!isCompact && (
        <span className="text-white font-bold text-xl tracking-tight">
          Autopilot<span className="text-accent">Rank</span>
        </span>
      )}
    </div>
  );
}
