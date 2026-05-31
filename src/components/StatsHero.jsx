import React from 'react';
import { Flame, Dumbbell, Trophy } from 'lucide-react';

// Bold brand-gradient hero for the Overview, mirroring MoneyGenius' NetWorthHero.
// Surfaces the week's training at a glance with a few headline stats.
export default function StatsHero({ metrics }) {
  const {
    workoutsThisWeek = 0,
    workoutsThisMonth = 0,
    newPRsThisMonth = 0,
    totalSets = 0,
  } = metrics || {};

  const stats = [
    { label: 'This month', value: workoutsThisMonth, suffix: workoutsThisMonth === 1 ? 'workout' : 'workouts', icon: Dumbbell },
    { label: 'New PRs', value: newPRsThisMonth, suffix: 'this month', icon: Trophy },
    { label: 'Total sets', value: totalSets, suffix: 'logged', icon: Flame },
  ];

  return (
    <div className="relative mb-5 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand via-brand to-[hsl(16_90%_46%)] p-6 text-white shadow-xl shadow-brand/25">
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-black/20 blur-2xl" />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Workouts this week</p>
        <p className="mt-1.5 text-5xl font-bold tracking-tight tabular-nums">
          {workoutsThisWeek}
          <span className="ml-2 align-middle text-base font-medium text-white/70">
            {workoutsThisWeek === 1 ? 'session' : 'sessions'}
          </span>
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {stats.map(({ label, value, suffix, icon: Icon }) => (
            <div key={label} className="rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur-sm">
              <Icon size={16} className="mb-1 text-white/80" />
              <p className="text-xl font-bold tabular-nums leading-none">{value}</p>
              <p className="mt-1 text-[11px] leading-tight text-white/70">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
