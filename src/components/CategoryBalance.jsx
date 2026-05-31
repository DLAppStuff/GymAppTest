import React from 'react';
import { ArrowDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

const CATEGORIES = ['Push', 'Pull', 'Legs'];

// Monthly Push/Pull/Legs set split. Surfaces the least-trained category so the
// user can tell at a glance if they've been avoiding one of the three.
export default function CategoryBalance({ counts, monthLabel, isDarkMode }) {
  const values = CATEGORIES.map((c) => counts?.[c] || 0);
  const total = values.reduce((sum, n) => sum + n, 0);
  const max = Math.max(1, ...values);
  const min = Math.min(...values);
  // Only flag a lagging category once there's a real imbalance.
  const hasImbalance = max - min > 0;

  return (
    <Card className={isDarkMode ? 'bg-zinc-800 border-zinc-700' : ''}>
      <CardHeader className="py-3">
        <CardTitle className={`text-base ${isDarkMode ? 'text-zinc-100' : ''}`}>
          Training Balance · {monthLabel}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">No sets logged this month yet.</p>
        ) : (
          <div className="space-y-3">
            {CATEGORIES.map((cat) => {
              const n = counts?.[cat] || 0;
              const pct = Math.round((n / total) * 100);
              const isLagging = hasImbalance && n === min;
              return (
                <div key={cat}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className={`flex items-center gap-2 font-medium ${isDarkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>
                      {cat}
                      {isLagging && (
                        <span className="flex items-center gap-0.5 rounded-full bg-loss/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-loss">
                          <ArrowDown size={10} /> lagging
                        </span>
                      )}
                    </span>
                    <span className={isDarkMode ? 'text-zinc-300' : 'text-zinc-600'}>
                      {n} {n === 1 ? 'set' : 'sets'} · {pct}%
                    </span>
                  </div>
                  <div className={`h-2.5 overflow-hidden rounded-full ${isDarkMode ? 'bg-zinc-700' : 'bg-zinc-200'}`}>
                    <div
                      className={`h-full rounded-full transition-all ${isLagging ? 'bg-loss' : 'bg-brand'}`}
                      style={{ width: `${Math.max((n / max) * 100, n > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
