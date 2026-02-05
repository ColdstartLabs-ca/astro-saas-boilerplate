'use client';

import type React from 'react';

export interface ITabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface IProps {
  tabs: ITabItem[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function InternalTabs({ tabs, activeTab, onChange }: IProps): JSX.Element {
  return (
    <div className="flex space-x-1 bg-surface/50 p-1 rounded-xl border border-border mb-6 w-fit overflow-x-auto max-w-full">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
            activeTab === tab.id
              ? 'bg-surface-light text-white shadow-sm'
              : 'text-secondary hover:text-white hover:bg-surface-light/50'
          }`}
        >
          {tab.icon && <span className="mr-2">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
