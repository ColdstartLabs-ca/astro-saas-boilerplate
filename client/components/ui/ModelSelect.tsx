'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import type { ModelTier } from '@shared/types/models.types';

export interface IModelSelectOption {
  id: string;
  name: string;
  description: string;
  detail?: string;
  tier: ModelTier;
  creditCost: number;
}

interface IModelSelectProps {
  options: IModelSelectOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
  noneDescription?: string;
  disabled?: boolean;
  placeholder?: string;
}

const TIER_ORDER: ModelTier[] = ['budget', 'balanced', 'ultra'];

const TIER_CONFIG: Record<ModelTier, { label: string; dotColor: string }> = {
  budget: { label: 'Budget', dotColor: 'bg-green-400' },
  balanced: { label: 'Balanced', dotColor: 'bg-blue-400' },
  ultra: { label: 'Ultra Quality', dotColor: 'bg-amber-400' },
};

function groupByTier(options: IModelSelectOption[]): Map<ModelTier, IModelSelectOption[]> {
  const groups = new Map<ModelTier, IModelSelectOption[]>();
  for (const tier of TIER_ORDER) {
    const items = options.filter(o => o.tier === tier);
    if (items.length > 0) groups.set(tier, items);
  }
  return groups;
}

function CreditBadge({ cost }: { cost: number }): JSX.Element {
  if (cost === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20 flex-shrink-0">
        Included
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0">
      +{cost} credit{cost > 1 ? 's' : ''}
    </span>
  );
}

export function ModelSelect({
  options,
  selectedId,
  onSelect,
  allowNone = false,
  noneLabel = 'None',
  noneDescription,
  disabled = false,
  placeholder = 'Select...',
}: IModelSelectProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const selected = selectedId ? options.find(o => o.id === selectedId) : null;
  const isNoneSelected = allowNone && (selectedId === null || selectedId === '');

  const triggerLabel = isNoneSelected
    ? noneLabel
    : selected
      ? selected.name
      : placeholder;

  const triggerSublabel = isNoneSelected
    ? noneDescription
    : selected
      ? `${TIER_CONFIG[selected.tier].label} · ${selected.detail ?? selected.description}`
      : undefined;

  const triggerCost = selected?.creditCost ?? 0;

  const grouped = groupByTier(options);

  const handleSelect = (id: string | null) => {
    onSelect(id);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 bg-main border rounded-lg px-3 py-2.5 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen ? 'border-accent ring-1 ring-accent/30' : 'border-border hover:border-accent/40'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">{triggerLabel}</div>
          {triggerSublabel && (
            <div className="text-[11px] text-muted truncate mt-0.5">{triggerSublabel}</div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {(selected || isNoneSelected) && <CreditBadge cost={isNoneSelected ? 0 : triggerCost} />}
          <ChevronDown
            className={`w-4 h-4 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-surface border border-border rounded-lg shadow-xl max-h-64 overflow-y-auto animate-fadeIn">
          {/* None option */}
          {allowNone && (
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                isNoneSelected
                  ? 'bg-accent/10 text-white'
                  : 'text-secondary hover:bg-surface-light'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{noneLabel}</div>
                {noneDescription && (
                  <div className="text-[11px] text-muted mt-0.5">{noneDescription}</div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <CreditBadge cost={0} />
                {isNoneSelected && <Check className="w-3.5 h-3.5 text-accent" />}
              </div>
            </button>
          )}

          {/* Grouped options */}
          {Array.from(grouped.entries()).map(([tier, items]) => (
            <div key={tier}>
              {/* Tier header */}
              <div className="px-3 py-1.5 flex items-center gap-2 border-t border-border/50 first:border-t-0">
                <span className={`w-1.5 h-1.5 rounded-full ${TIER_CONFIG[tier].dotColor}`} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {TIER_CONFIG[tier].label}
                </span>
              </div>

              {/* Options */}
              {items.map(option => {
                const isSelected = selectedId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option.id)}
                    className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-accent/10 text-white'
                        : 'text-secondary hover:bg-surface-light'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{option.name}</div>
                      <div className="text-[11px] text-muted mt-0.5 truncate">
                        {option.detail ? `${option.detail} · ${option.description}` : option.description}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <CreditBadge cost={option.creditCost} />
                      {isSelected && <Check className="w-3.5 h-3.5 text-accent" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
