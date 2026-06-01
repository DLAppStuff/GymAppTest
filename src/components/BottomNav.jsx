import React from 'react';
import { Home, ArrowUpFromLine, ArrowDownToLine, Footprints, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

// Bottom tab bar. Drives the controlled <Tabs value> in App.js.
// Push/Pull/Legs map to the workout categories; "Runs" logs running efforts.
// (App settings live behind the gear icon in the header.)
const NAV_ITEMS = [
  { value: 'Overview', label: 'Home', icon: Home },
  { value: 'Push', label: 'Push', icon: ArrowUpFromLine },
  { value: 'Pull', label: 'Pull', icon: ArrowDownToLine },
  { value: 'Legs', label: 'Legs', icon: Footprints },
  { value: 'Runs', label: 'Runs', icon: Activity },
];

export default function BottomNav({ currentTab, onChange }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/80 backdrop-blur-xl pb-safe">
      <div className="mx-auto flex max-w-6xl items-stretch justify-around px-1">
        {NAV_ITEMS.map(({ value, label, icon: Icon }) => {
          const active = currentTab === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onChange(value)}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors',
                active ? 'text-brand' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-14 items-center justify-center rounded-full transition-all',
                  active ? 'bg-brand/15' : 'bg-transparent'
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
