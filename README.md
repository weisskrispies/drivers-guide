# 🎸 Bay Area Concert Radar

A responsive web app that automatically scrapes upcoming concerts across
**Oakland, Berkeley, San Francisco and the greater Bay Area**, lets you filter
by your favorite bands, and emails you when they announce a show.

Built with Next.js 16 (App Router), Supabase, and Tailwind CSS.

## Features

- **Auto-updating listings** — a scheduled job pulls Bay Area music events from
  the Ticketmaster Discovery API (pluggable — add more sources easily).
- **Filter by favorite bands** — star any act; the "Only my bands" toggle,
  city, date-range, and free-text filters all work instantly in the browser.
  Favorites persist in `localStorage`, so no login is required to browse.
- **Email alerts** — subscribe with your email and get notified when a favorite
  band plays the Bay Area. Optional per-city alert filtering. One-click
  unsubscribe.
- **Works with zero config** — with no backend set up, the site renders a
  built-in sample dataset so you can see it immediately.

## How it works

```
 Ticketmaster / sources ──► /api/cron/scrape ──► Supabase `concerts`
                                                        │
 Browser (page.tsx) ◄────────────────────────── listConcerts()
                                                        │
 Subscribers (email + bands) ──► /api/cron/alerts ──► Resend email
```

- `src/lib/concerts/sources/` — scraper adapters (`ticketmaster.ts`, plus a
  `seed` source). Register new ones in `sources/index.ts`.
- `src/lib/concerts/scrape.ts` — runs every configured source, keeps Bay Area
  shows, upserts into Supabase (deduped on `source` + `source_id`).
- `src/lib/concerts/alerts.ts` — matches new concerts to subscribers' favorite
  bands and sends emails, recording sends in `sent_alerts` so nobody is
  double-notified.
- `src/app/` — the responsive UI (`components/ConcertApp.tsx` and friends) and
  the `saveSubscription` server action.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in what you have (all optional for a demo)
npm run dev
```

Open http://localhost:3000. With no env configured you'll see sample data.

## Wiring up live data

1. **Supabase** — create a project, then run `supabase/concerts.sql` in the SQL
   editor (or `supabase db push`). Set `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
2. **Ticketmaster** — get a free key at
   https://developer.ticketmaster.com/ and set `TICKETMASTER_API_KEY`.
3. **Email (optional)** — set `RESEND_API_KEY` and `ALERT_FROM_EMAIL`
   (a verified sender). Without it, alert emails print to the server log.
4. **Cron secret** — set `CRON_SECRET` to any random string.

### Running the jobs

The endpoints are protected by `CRON_SECRET`:

```bash
# Scrape sources and upsert Bay Area shows
curl -H "Authorization: Bearer $CRON_SECRET" https://your-app/api/cron/scrape

# Match new shows to subscribers and send alerts
curl -H "Authorization: Bearer $CRON_SECRET" https://your-app/api/cron/alerts
```

On **Vercel**, `vercel.json` already schedules these (scrape every 6h, alerts
30 min later). Vercel Cron sends the `CRON_SECRET` automatically. On other
hosts, point any scheduler (GitHub Actions, cron-job.org, etc.) at the two
URLs with the `Authorization: Bearer <CRON_SECRET>` header.

To load the built-in sample dataset into a real database once, set
`SEED_CONCERTS=1` and hit `/api/cron/scrape`.

## Environment variables

See [`.env.example`](./.env.example) for the full list. Everything is optional
for a local demo; each capability (persistence, live scraping, email) turns on
as you add its keys.
