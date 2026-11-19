import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div
      className={twMerge(
        clsx(
          'inline-flex p-1 bg-[#1C1510] rounded-xl border border-[#493522] shadow-leather flex-wrap gap-1',
          className
        )
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={twMerge(
              clsx(
                'inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-serif font-medium rounded-lg transition-all duration-150 select-none border',
                isActive
                  ? 'bg-[#30241B] text-[#C69B56] border-[#B18A4C] shadow-gold-glow font-bold'
                  : 'text-[#D9C39B]/70 border-transparent hover:text-[#F5EBD8] hover:bg-[#281F19]'
              )
            )}
          >
            {tab.icon && <span className="w-3.5 h-3.5 shrink-0 text-[#B18A4C]">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={clsx(
                  'ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold',
                  isActive
                    ? 'bg-[#1C1510] text-[#C69B56] border border-[#B18A4C]/40'
                    : 'bg-[#281F19] text-[#D9C39B]/60 border border-[#493522]'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
