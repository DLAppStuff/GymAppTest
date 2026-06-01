import React from 'react';
import { Activity, Route, Timer, Gauge } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

// Format a pace given in seconds-per-km as "m:ss /km".
const formatPaceSec = (paceSec) => {
  if (!paceSec || paceSec <= 0) return '–';
  const mins = Math.floor(paceSec / 60);
  const secs = Math.round(paceSec % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Monthly running summary: total distance, run count, average pace, and the
// month's longest run / best pace. Mirrors CategoryBalance's card styling.
export default function RunningStats({
  kmThisMonth = 0,
  runsThisMonth = 0,
  avgPaceSecPerKm = null,
  longestRunKm = 0,
  bestPaceSecPerKm = null,
  monthLabel,
  isDarkMode,
}) {
  const stats = [
    { label: 'Distance', value: kmThisMonth.toFixed(1), suffix: 'km', icon: Route },
    { label: 'Runs', value: runsThisMonth, suffix: runsThisMonth === 1 ? 'run' : 'runs', icon: Activity },
    { label: 'Avg pace', value: formatPaceSec(avgPaceSecPerKm), suffix: '/km', icon: Gauge },
    { label: 'Best pace', value: formatPaceSec(bestPaceSecPerKm), suffix: '/km', icon: Timer },
  ];

  return (
    <Card className={isDarkMode ? 'bg-zinc-800 border-zinc-700' : ''}>
      <CardHeader className="py-3">
        <CardTitle className={`text-base ${isDarkMode ? 'text-zinc-100' : ''}`}>
          Running · {monthLabel}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {runsThisMonth === 0 ? (
          <p className="text-sm text-muted-foreground">No runs logged this month yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {stats.map(({ label, value, suffix, icon: Icon }) => (
                <div
                  key={label}
                  className={`rounded-2xl px-3 py-2.5 ${isDarkMode ? 'bg-zinc-700/50' : 'bg-zinc-100'}`}
                >
                  <Icon size={16} className="mb-1 text-run" />
                  <p className={`text-xl font-bold tabular-nums leading-none ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {value}
                    <span className="ml-1 align-middle text-[11px] font-medium text-muted-foreground">{suffix}</span>
                  </p>
                  <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Longest run this month: <span className="font-semibold text-run">{longestRunKm.toFixed(1)} km</span>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
