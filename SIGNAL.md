# Signal v2 — Build Guide

Signal is a per-user, AI-curated industry intelligence feed at `/connect/signal`. v2 separates **global ingestion** (one shared pool of stories per industry) from **per-user ranking** (personalized scoring with "why you saw this" reasons), and adds a **nightly learning loop** that turns 👍/👎 feedback into durable topic + source weights.

## Architecture

```
 ┌─────────────────────────────┐
 │ Global ingest (every 2h)    │  signal-ingest
 │  RSS · Reddit · Nitter · HN │  → AI batch score (rule fallback)
 │  → dedupe (hash + simhash)  │  → upsert signal_items
 └────────────┬────────────────┘
              │
              ▼
 ┌─────────────────────────────┐
 │ signal_items (shared pool)  │
 └────────────┬────────────────┘
              │ on page visit / refresh
              ▼
 ┌─────────────────────────────┐
 │ signal-rank (per-user)      │  importance + topic_w*5 + source_w*3
 │  hybrid score + diversity   │  + recency + freshness, max 3/source
 │  + "why" caption            │
 └────────────┬────────────────┘
              │
              ▼  user reacts 👍 / 👎 / clicks / saves
 ┌─────────────────────────────┐
 │ signal_feedback             │
 └────────────┬────────────────┘
              │ nightly aggregate
              ▼
 ┌─────────────────────────────┐
 │ signal-learn                │  +1 great, −1 not_interested, +0.25 click
 │  decays old weights 0.95/wk │  → updates signal_preferences.topic_weights
 └─────────────────────────────┘

 Background:
  • signal-image-retry (every 30 min) — OG → Twitter → AI fallback
  • signal-digest      (every hour)   — sends top-5 email at user's local time
```

## Frontend

- **Page**: `src/pages/ConnectSignal.tsx`
- **Route**: `/connect/signal` (mounted via `ConnectProduct.tsx`)
- **Nav**: between Leads and Pipeline (`useConnectNavConfig`).

UI sections:
1. Hero card with manifesto quote.
2. Daily-digest scheduler (toggle + time picker, persisted to `signal_preferences`).
3. Refresh → calls **`signal-ingest`** for the user's industry, then re-ranks.
4. Feed grid: image · type+score chip · title · AI summary · **"✦ why you saw this"** caption · topic chips · source link · 👍/👎.
5. AI cover generation on demand → `signal-image`.

The page calls **`signal-rank`** (not raw table reads) so users always see personalized ordering, diversity caps, and reason captions.

## Edge functions

### `signal-ingest` (global, cron every 2h)
- No JWT required (cron-triggered). Iterates all industries (or a passed-in list).
- Pulls **RSS** (Google News + curated trade press), **Reddit** (`.json` public endpoints), **Nitter** (rotating public instances in `signal-sources.ts`), and **Hacker News** Algolia for tech.
- Computes SHA-256 `hash` and SimHash of the title for near-duplicate detection.
- Batch-scores via Lovable AI (`google/gemini-2.5-flash`, JSON mode). On AI failure, **rule-based fallback** uses `TIER_1_SOURCES` boost + keyword heuristics so the pipeline never stalls.
- Tries `og:image` extraction in parallel (4s timeout). Misses go to `signal_image_queue`.
- Logs every run to `signal_ingest_runs` and updates `signal_source_health` (success/fail counts, last_status).

### `signal-rank` (per-user, on demand)
- JWT required. Reads `signal_preferences` + dismissed feedback for the user.
- Pulls last 72h candidates for the industry (max 300), filters blocked topics/sources and dismissed items.
- Score = `clamp(importance + clamp(Σtopic_weight*5, ±25) + clamp(source_weight*3, ±10) + recency + freshness, 0, 150)`.
  - `recency`: 20 (<6h), 15 (<24h), 8 (<48h), 3 (<72h).
  - `freshness`: +10 if `created_at > last_seen_at`.
- Diversity cap: max 3 per source in top N (overflow appended).
- Generates a 1-line "why" caption (`Breaking · You like NAIC`, etc.).
- Updates `signal_preferences.last_seen_at` so the next visit's freshness boost only applies to genuinely new items.

### `signal-learn` (nightly cron)
- Aggregates the last 30 days of `signal_feedback` per user.
- Weights: `+1 great_info`, `−1 not_interested`, `+0.25 clicked`, `+0.5 saved`.
- Applies decay (multiply existing weights by 0.95) before adding the new deltas; clamps to ±10.
- Writes back to `signal_preferences.topic_weights` and `source_weights`.

### `signal-image-retry` (cron every 30 min)
- Walks `signal_image_queue` rows that are still missing images.
- Tries OG → Twitter card → AI generation in order; updates the row + dequeues on success.

### `signal-digest` (cron hourly)
- For each `signal_preferences` row where `digest_enabled` AND the user's local hour matches `digest_time` AND not sent today, calls `signal-rank` and emails the top 5 via Resend.
- Updates `digest_last_sent_at`.

### `signal-image` (manual)
- JWT required. Generates an editorial cover via `google/gemini-2.5-flash-image`, sets `image_url` + `ai_image=true`.

## Sources (`supabase/functions/_shared/signal-sources.ts`)

`INDUSTRY_SOURCES` maps each vertical id (matching `connect-verticals.ts`) to:

| field            | example                                            |
|------------------|----------------------------------------------------|
| `rss_news`       | Google News queries + Insurance Journal, FreightWaves, Construction Dive, … |
| `reddit`         | `["Insurance", "InsuranceClaims"]`                 |
| `nitter_handles` | `["InsuranceJrnl", "AonPLC"]` (rotated across `NITTER_INSTANCES`) |
| `regulatory`     | `["https://content.naic.org/rss.xml"]`             |
| `substack`, `podcast_rss` | reserved                                  |

Tier-1 publication names live in `TIER_1_SOURCES` and get a fallback-scoring boost when AI is unavailable. 17 verticals are configured (insurance, real_estate, trucking, contractors fully tuned; the rest use a `generic(label)` template until tuned).

## Storage / Training Schema

### `signal_items` — shared story pool
| column            | type        | notes                                  |
|-------------------|-------------|----------------------------------------|
| id                | uuid PK     |                                        |
| title, summary    | text        | AI-tightened                           |
| source_name, source_url, image_url | text |                                |
| ai_image          | bool        | AI-generated cover                     |
| industry, sub_vertical | text   | matches vertical id                    |
| topics            | text[]      | 3-5 tags                               |
| signal_type       | text        | news \| trend \| regulatory \| risk \| opportunity |
| source_kind       | text        | news \| reddit \| x \| hn \| reg \| blog |
| source_tier       | int (1-3)   | 1 = Tier-1 publication                 |
| importance_score  | int 0-100   |                                        |
| hash              | text UNIQUE | sha256(title+url) — exact dedupe       |
| title_simhash     | bigint      | near-duplicate detection               |
| raw, published_at, created_at | …  |                                        |

RLS: any authenticated user can SELECT.

### `signal_feedback` — training labels (the dataset)
| column          | type    | notes                                                                  |
|-----------------|---------|------------------------------------------------------------------------|
| user_id         | uuid    |                                                                        |
| signal_item_id  | uuid FK | → signal_items(id) ON DELETE CASCADE                                   |
| reaction        | text    | `not_interested` \| `great_info` \| `viewed` \| `clicked` \| `saved`   |
| topics_snapshot | text[]  | snapshot at time of reaction (durable training)                        |
| source_snapshot | text    |                                                                        |
| created_at      | timestamptz |                                                                    |

UNIQUE (user_id, signal_item_id, reaction). RLS owner-only.

### `signal_preferences` — per-user state
| column            | type     | notes                                              |
|-------------------|----------|----------------------------------------------------|
| user_id           | uuid PK  |                                                    |
| topic_weights     | jsonb    | `{ "topic": -10..+10 }` — written by `signal-learn`|
| source_weights    | jsonb    | `{ "Reuters": 1.5 }`                               |
| blocked_topics    | text[]   | hard exclude                                       |
| blocked_sources   | text[]   |                                                    |
| industry_override | text     |                                                    |
| digest_enabled    | bool     |                                                    |
| digest_time       | time     | local time                                         |
| digest_timezone   | text     | IANA                                               |
| digest_last_sent_at, last_seen_at | timestamptz |                                  |

### Operational tables
- **`signal_ingest_runs`** — per-run log (industry, sources hit, fetched/inserted counts, errors).
- **`signal_source_health`** — rolling success/fail counts per source URL; surfaces in admin.
- **`signal_image_queue`** — items still missing covers; drained by `signal-image-retry`.

RLS: admin-only on the operational tables; owner-only on per-user tables.

## Cron schedule

Created via `supabase--insert` (project-specific URL/key — not migrations). All call edge functions with the project anon key:

| job                        | cadence       | function              |
|----------------------------|---------------|-----------------------|
| `signal-ingest-2h`         | `0 */2 * * *` | `signal-ingest`       |
| `signal-image-retry-30m`   | `*/30 * * * *`| `signal-image-retry`  |
| `signal-learn-daily`       | `15 4 * * *`  | `signal-learn`        |
| `signal-digest-hourly`     | `0 * * * *`   | `signal-digest`       |

## Learning loop summary

1. User reacts → row in `signal_feedback` with `topics_snapshot`.
2. Nightly `signal-learn` decays old weights ×0.95 then adds the day's deltas, clamped ±10, and writes `signal_preferences.topic_weights` / `source_weights`.
3. Next `signal-rank` call uses those weights — instantly more relevant ordering and a richer "why" caption.

## Adding a new industry

1. Add an entry to `INDUSTRY_SOURCES` in `supabase/functions/_shared/signal-sources.ts` (use `generic(label)` to start).
2. Add the vertical to `connect-verticals.ts` (already done for the 17 supported).
3. The next `signal-ingest` run picks it up automatically.

## Cost & rate limits

- One ingest cycle ≈ N industries × 1 Gemini Flash batch call (~20 stories scored per prompt). Rule-based fallback prevents stalls when AI is down.
- Image generation only runs on user click or in the retry queue (lazy).
- Reddit/Nitter calls are throttled per source; failures get logged to `signal_source_health` so flaky sources can be muted in admin.

## Files of interest

- `src/pages/ConnectSignal.tsx` — feed UI
- `supabase/functions/_shared/signal-sources.ts` — industry source map
- `supabase/functions/_shared/signal-utils.ts` — hashing, simhash, AI scorer, fallback
- `supabase/functions/signal-ingest/index.ts`
- `supabase/functions/signal-rank/index.ts`
- `supabase/functions/signal-learn/index.ts`
- `supabase/functions/signal-digest/index.ts`
- `supabase/functions/signal-image/index.ts` & `signal-image-retry/index.ts`