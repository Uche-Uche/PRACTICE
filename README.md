# RusOutput

RusOutput is a React app for practicing spoken Russian.

It includes:
- a phrase bank with categories and pronunciation notes
- spaced-repetition flashcards
- browser text-to-speech for Russian playback
- a presentation rehearsal mode that tracks difficult sentences

## Run Locally

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Supabase Setup

1. In Supabase, open the SQL Editor and run [`supabase/schema.sql`](./supabase/schema.sql).
2. In `Authentication > Providers`, enable Google.
3. In `Authentication > URL Configuration`, add:
   - your Vercel production URL
   - `http://localhost:5173`
4. Copy `.env.example` to `.env.local` and fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

Important:
- The service role key is not used in the frontend and should never be exposed in Vercel client-side env vars.
- User app data is stored per signed-in user in the `app_state` table.

## Vercel Setup

In the Vercel project settings, add these environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

After adding them, redeploy the project.

## Notes

- The app works with either a host-provided `window.storage` API or regular browser `localStorage`.
- The main application component still lives in `RusOutput.jsx`.
