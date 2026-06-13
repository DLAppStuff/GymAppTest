import { supabase, isSupabaseConfigured } from './supabase';

// localStorage keys kept identical to the original app so existing data on a
// device is still picked up, and so we have an offline cache.
const LS_PROGRESS = 'gymProgress_v3';
const LS_WEIGHTS = 'bodyWeights';
const LS_RUNS = 'runs';
const LS_ACTIVITIES = 'activities';

const EMPTY = { exercises: {}, prs: {}, bodyWeights: [], runs: [], activities: [] };

function readLocal() {
  let exercises = {};
  let prs = {};
  let bodyWeights = [];
  let runs = [];
  let activities = [];
  try {
    const progress = localStorage.getItem(LS_PROGRESS);
    if (progress) {
      const parsed = JSON.parse(progress);
      exercises = parsed.exercises || {};
      prs = parsed.prs || {};
    }
    const weights = localStorage.getItem(LS_WEIGHTS);
    if (weights) bodyWeights = JSON.parse(weights);
    const storedRuns = localStorage.getItem(LS_RUNS);
    if (storedRuns) runs = JSON.parse(storedRuns);
    const storedActivities = localStorage.getItem(LS_ACTIVITIES);
    if (storedActivities) activities = JSON.parse(storedActivities);
  } catch (err) {
    console.error('Failed to read local data:', err);
  }
  return { exercises, prs, bodyWeights, runs, activities };
}

function writeLocal({ exercises, prs, bodyWeights, runs, activities }) {
  try {
    localStorage.setItem(LS_PROGRESS, JSON.stringify({ exercises, prs }));
    localStorage.setItem(LS_WEIGHTS, JSON.stringify(bodyWeights));
    localStorage.setItem(LS_RUNS, JSON.stringify(runs || []));
    localStorage.setItem(LS_ACTIVITIES, JSON.stringify(activities || []));
  } catch (err) {
    console.error('Failed to write local cache:', err);
  }
}

// Returns true if the state holds any real user data (used to decide whether
// to seed an empty cloud row from this device's local cache on first login).
function hasData({ exercises, prs, bodyWeights, runs, activities }) {
  return (
    Object.keys(exercises || {}).length > 0 ||
    Object.keys(prs || {}).length > 0 ||
    (bodyWeights || []).length > 0 ||
    (runs || []).length > 0 ||
    (activities || []).length > 0
  );
}

/**
 * Load the user's data. With Supabase configured + a signed-in user, the cloud
 * row is the source of truth. If no cloud row exists yet but this device has
 * local data, we return the local data and seed the cloud with it (one-time
 * migration for the device that holds your history).
 */
export async function loadData(userId) {
  if (!isSupabaseConfigured || !userId) {
    return readLocal();
  }

  const { data, error } = await supabase
    .from('gym_data')
    .select('exercises, prs, body_weights, runs, activities')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Supabase load failed, using local cache:', error);
    return readLocal();
  }

  if (data) {
    const loaded = {
      exercises: data.exercises || {},
      prs: data.prs || {},
      bodyWeights: data.body_weights || [],
      runs: data.runs || [],
      activities: data.activities || [],
    };
    writeLocal(loaded); // refresh offline cache
    return loaded;
  }

  // No cloud row yet — seed it from this device's local data if we have any.
  const local = readLocal();
  if (hasData(local)) {
    await saveDataNow(userId, local);
  }
  return local;
}

/** Immediate write: always update the local cache, then upsert to the cloud. */
export async function saveDataNow(userId, state) {
  const data = {
    exercises: state.exercises || {},
    prs: state.prs || {},
    bodyWeights: state.bodyWeights || [],
    runs: state.runs || [],
    activities: state.activities || [],
  };
  writeLocal(data);

  if (!isSupabaseConfigured || !userId) return;

  const { error } = await supabase.from('gym_data').upsert(
    {
      user_id: userId,
      exercises: data.exercises,
      prs: data.prs,
      body_weights: data.bodyWeights,
      runs: data.runs,
      activities: data.activities,
    },
    { onConflict: 'user_id' }
  );

  if (error) console.error('Supabase save failed (kept in local cache):', error);
}

// Debounced save so rapid edits (adding several sets) collapse into one write.
let saveTimer = null;
export function saveData(userId, state, delay = 800) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveDataNow(userId, state);
  }, delay);
}

export { EMPTY };
