'use client';

import { Search, X } from 'lucide-react';

interface IBlogSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function BlogSearch({
  value,
  onChange,
  placeholder = 'Search articles...',
}: IBlogSearchProps): JSX.Element {
  return (
    <div className="relative max-w-sm sm:max-w-md lg:max-w-lg w-full">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full pl-10 pr-10 py-2.5 bg-surface/50 border border-border/50 rounded-full text-sm text-white placeholder:text-text-secondary focus:outline-none focus:border-accent/50 focus:bg-surface transition-all"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
