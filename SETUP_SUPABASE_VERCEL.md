# GymGenius — Supabase + Vercel setup

This app now syncs your data to a private Supabase database and deploys on
Vercel, with email/password login. Below are the one-time steps to wire it up.

> **How it works:** all your data (exercises, PRs, body weights) lives in a
> single row per user in a `gym_data` table, stored as JSON. Row Level Security
> means only *you* can read or write *your* row, even though the app ships a
> public "anon" key. Data is also cached in your browser so the app keeps
> working offline at the gym; it re-syncs when you're back online.

---

## 1. Create the Supabase project

1. Go to <https://supabase.com> → **New project**. Pick a name, a strong
   database password (you won't need it for the app), and a region near you.
2. Wait ~2 minutes for it to provision.

## 2. Create the database table

1. In the project, open **SQL Editor** → **New query**.
2. Open [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   from this repo, copy its entire contents into the editor, and click **Run**.
   You should see "Success. No rows returned."

## 3. Configure auth (single user)

1. Go to **Authentication → Providers → Email** and make sure **Email** is
   enabled.
2. Optional but recommended for a personal app: under **Authentication →
   Sign In / Providers** (or **Settings**), turn **Confirm email** *off* so you
   can sign up and immediately sign in without clicking a confirmation link.
   (If you leave it on, just confirm via the email Supabase sends.)

## 4. Get your API keys

1. Go to **Project Settings → API**.
2. Copy two values:
   - **Project URL** → `REACT_APP_SUPABASE_URL`
   - **anon public** key → `REACT_APP_SUPABASE_ANON_KEY`

## 5. Run it locally (optional but recommended)

1. Copy `.env.local.example` to `.env.local` and paste in the two values above.
2. `npm install` then `npm start`.
3. The app now shows a login screen. Click **Sign up**, create your account
   (your email + a password), then sign in.
4. Use **Import** (top right) to load your data — see "Migrating your data"
   below.

## 6. Deploy on Vercel

1. Go to <https://vercel.com> → **Add New… → Project** → import the
   `DLAppStuff/GymAppTest` GitHub repo. Vercel auto-detects Create React App
   (build command `npm run build`, output dir `build`).
2. Before deploying, expand **Environment Variables** and add the same two:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
3. Click **Deploy**. Every future `git push` to the branch you connect will
   auto-deploy.
4. Open the Vercel URL, sign in, and import your data.

> **Tip:** add the Vercel URL to your phone's home screen for an app-like icon.

---

## Migrating your data

You already exported a JSON backup — good. One caveat: the **old** export only
included `exercises` and `prs`, **not** your body-weight history. To grab
*everything* from your current (Netlify) app so nothing is lost:

1. Open your existing Netlify GymGenius site in a desktop browser.
2. Open DevTools (F12) → **Console**, paste this, press Enter — it downloads a
   complete backup file:

   ```js
   (() => {
     const progress = JSON.parse(localStorage.getItem('gymProgress_v3') || '{}');
     const bodyWeights = JSON.parse(localStorage.getItem('bodyWeights') || '[]');
     const data = { exercises: progress.exercises || {}, prs: progress.prs || {}, bodyWeights };
     const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
     const a = document.createElement('a');
     a.href = URL.createObjectURL(blob);
     a.download = 'gym-genius-full-backup.json';
     a.click();
   })();
   ```

3. In the new (Vercel) app, after signing in, click **Import** and select that
   file. It loads into the app and syncs up to Supabase automatically.

The app's **Export** button now also includes body weights, so future backups
are complete.

---

## Notes & limitations

- **Conflict handling:** if you edit on two devices while offline, the last
  device to sync wins (whole-record overwrite). Fine for a single user; just
  avoid editing two phones simultaneously offline.
- **Keeping Netlify:** this work is on the `feat/supabase-vercel` branch, so
  your existing Netlify deploy from `main` is untouched until you merge.
- **Local-only fallback:** with no env vars set, the app runs against
  localStorage with no login — handy for quick local hacking.
