# Institute of Karate and Allied Arts — Kolnad Dojo CRM

Attendance & fee register, wired to a live Supabase backend (already configured — no setup needed to run it).

## What's already done for you
- **Supabase project** `kolnad-dojo-crm` (ref `ewiwprhhrbiydccfqeoy`) is live with tables `students`, `attendance`, `fees`, RLS enabled, and helper SQL functions for attendance stats and unpaid-fee lookups.
- The app's Supabase URL + publishable key are already hardcoded as fallbacks in `lib/supabaseClient.ts`, so it works immediately with zero env vars.
- Tested against dummy data including SQL-injection and XSS payloads — all handled safely as inert data.

## Deploying to Vercel
```bash
npm i -g vercel
cd dojo-crm
vercel deploy --prod
```
Or push to GitHub and import the repo in the Vercel dashboard. Framework preset: Next.js (auto-detected). No env vars required.

## Local dev
```bash
npm install
npm run dev
```

## Later: monthly unpaid-fees email (not set up yet)
The database already has a `get_unpaid_students(date)` function that returns the current month's unpaid list, so this can be wired up to a scheduled email whenever you want it. Just say the word and it can be added back in.
