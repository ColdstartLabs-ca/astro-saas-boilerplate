'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Coins } from 'lucide-react';
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
  showCreditCost?: boolean;
}

const TIER_ORDER: ModelTier[] = ['budget', 'balanced', 'pro', 'ultra'];

const TIER_CONFIG: Record<ModelTier, { label: string; dotColor: string }> = {
  budget: { label: 'Budget', dotColor: 'bg-green-400' },
  balanced: { label: 'Balanced', dotColor: 'bg-blue-400' },
  pro: { label: 'Pro', dotColor: 'bg-purple-400' },
  ultra: { label: 'Ultra', dotColor: 'bg-amber-400' },
};

/**
 * Format credit cost for display in badges.
 * - 0 credits: "Included" (for budget image preset)
 * - 1 credit: "1 credit"
 * - 2+ credits: "N credits"
 */
function formatCreditCost(cost: number): string {
  if (cost === 0) return 'Included';
  return `${cost} credit${cost > 1 ? 's' : ''}`;
}

function groupByTier(options: IModelSelectOption[]): Map<ModelTier, IModelSelectOption[]> {
  const groups = new Map<ModelTier, IModelSelectOption[]>();
  for (const tier of TIER_ORDER) {
    const items = options.filter(o => o.tier === tier);
    if (items.length > 0) groups.set(tier, items);
  }
  return groups;
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
  showCreditCost = false,
}: IModelSelectProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
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

  const triggerLabel = isNoneSelected ? noneLabel : selected ? selected.name : placeholder;

  const triggerSublabel = isNoneSelected
    ? noneDescription
    : selected
      ? selected.description
      : undefined;

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
        onClick={() => {
          if (disabled) return;
          if (!isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            setOpenUpward(spaceBelow < 280);
          }
          setIsOpen(prev => !prev);
        }}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 bg-main border rounded-lg px-3 py-2.5 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen ? 'border-accent ring-1 ring-accent/30' : 'border-border hover:border-accent/40'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-white truncate">{triggerLabel}</div>
          {triggerSublabel && (
            <div className="text-xs text-muted truncate mt-0.5">{triggerSublabel}</div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {showCreditCost && selected && (
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1 ${
                selected.creditCost === 0
                  ? 'bg-green-500/10 text-green-300 border border-green-500/20'
                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
              }`}
            >
              <Coins className="w-2.5 h-2.5" />
              {formatCreditCost(selected.creditCost)}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`absolute z-50 w-full bg-surface border border-border rounded-lg shadow-xl max-h-64 overflow-y-auto animate-fadeIn ${
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {/* None option */}
          {allowNone && (
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                isNoneSelected ? 'bg-accent/10 text-white' : 'text-secondary hover:bg-surface-light'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{noneLabel}</div>
                {noneDescription && (
                  <div className="text-[11px] text-muted mt-0.5">{noneDescription}</div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
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
                        {option.detail
                          ? `${option.detail} · ${option.description}`
                          : option.description}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {showCreditCost && (
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1 ${
                            option.creditCost === 0
                              ? 'bg-green-500/10 text-green-300 border border-green-500/20'
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          }`}
                        >
                          <Coins className="w-2.5 h-2.5" />
                          {formatCreditCost(option.creditCost)}
                        </span>
                      )}
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
