import { Flame, Bike, Waves, Activity, CircleDot, Flower2, Sparkles } from 'lucide-react';

// Registry of "other" activities the app can log (Padel, HIIT, etc.). This is the
// single extension point: adding a new trackable activity = one entry here. Each
// activity is stored minimally as { id, type, label, date, durationSec, notes };
// the colour comes from the shared --activity token so they read consistently
// across the nav, heatmap and trends chart.
//   custom: true  -> the user types a free-form name (stored on the entry's label).
export const ACTIVITY_TYPES = [
  { id: 'Padel', label: 'Padel', icon: CircleDot },
  { id: 'HIIT', label: 'HIIT', icon: Flame },
  { id: 'JumpRope', label: 'Jump rope', icon: Activity },
  { id: 'Cycling', label: 'Cycling', icon: Bike },
  { id: 'Swimming', label: 'Swimming', icon: Waves },
  { id: 'Yoga', label: 'Yoga', icon: Flower2 },
  { id: 'Other', label: 'Other', icon: Sparkles, custom: true },
];

// Look up a type config by id, falling back to the "Other" entry so a renamed or
// unknown type still resolves to an icon/label rather than crashing.
export const getActivityType = (id) =>
  ACTIVITY_TYPES.find((t) => t.id === id) ||
  ACTIVITY_TYPES[ACTIVITY_TYPES.length - 1];
