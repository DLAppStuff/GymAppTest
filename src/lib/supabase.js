import { createClient } from '@supabase/supabase-js';

// CRA exposes env vars prefixed with REACT_APP_ to the browser bundle.
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// When the env vars are missing (e.g. a fresh clone with no .env.local) we
// run in "local-only" mode: no auth, data stays in localStorage. This keeps
// `npm start` working out of the box and makes the Supabase wiring opt-in.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
