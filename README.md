# AURA — Business Intelligence & Insurance Agency Platform

**Live site:** [buildingaura.site](https://buildingaura.site)  
**Stack:** React 18 · TypeScript · Vite · Supabase · Tailwind CSS · shadcn/ui

AURA is a full-stack platform built for insurance agencies. It combines AI-powered lead discovery, outreach, pipeline management, client intake forms, email/calendar sync, and ACORD form automation into a single workspace.

---

## Products

| Product | Description |
|---|---|
| **AURA Connect** | Lead engine — discover, score, enrich, and reach out to prospects |
| **AURA Studio** | Content creation and design tools |
| **AURA Concierge** | Managed service layer |
| **AURA Pulse** | Analytics and agency performance insights |
| **Clark Integration** | Insurance quoting form automation |
| **Email Hub** | Gmail/Outlook sync with AI-assisted drafting |
| **Calendar Assistant** | Smart scheduling and meeting management |
| **Lead Engine** | AI-scored prospect discovery from 10+ data sources |
| **Loss Run Management** | Insurance document handling and carrier requests |
| **ACORD Form Automation** | PDF extraction, field mapping, and auto-fill |
| **Chrome Extension** | LinkedIn analytics sync for AURA Connect |

---

## Tech Stack

### Frontend
- **React 18.3** with TypeScript
- **Vite 5** — build tool with manual chunk splitting for PDF/ACORD libs
- **Tailwind CSS 3.4** + **shadcn/ui** (Radix UI primitives)
- **React Router v6** — client-side routing
- **TanStack Query v5** — server state and caching
- **React Hook Form** + **Zod** — forms and validation
- **Recharts** + **D3.js** — data visualization
- **ElevenLabs React** — voice features
- **Daily.co** — video conferencing
- **pdf-lib / jspdf / html2canvas** — PDF generation
- **Fabric.js** — canvas drawing

### Backend
- **Supabase** — PostgreSQL database, Auth, Realtime, Storage
- **Supabase Edge Functions** (Deno/TypeScript) — 77+ serverless functions
- **Resend** — transactional email
- **Gmail API / Microsoft Graph** — OAuth email sync
- **OpenAI / Gemini** — AI drafting and enrichment
- **Serper / Apollo / PDL** — lead contact enrichment waterfall

---

## Project Structure

```
├── src/
│   ├── pages/              # Route-level page components (40+ pages)
│   ├── components/
│   │   ├── ui/             # shadcn/ui base components
│   │   ├── connect/        # AURA Connect feature components
│   │   ├── connect-demo/   # Demo/trial versions
│   │   ├── clark/          # Clark insurance integration
│   │   └── lead-engine/    # Lead engine UI components
│   ├── hooks/              # Custom React hooks (useLeadEngine, useAuth, etc.)
│   ├── services/           # API service layer
│   ├── lib/                # Utilities (ACORD forms, PDF, Clark, intake links)
│   └── integrations/
│       └── supabase/       # Generated types + Supabase client
├── supabase/
│   ├── functions/          # Edge functions (77+)
│   └── migrations/         # SQL migrations
├── extension/              # Chrome extension (Manifest V3)
│   └── ...                 # LinkedIn analytics sync
├── public/                 # Static assets
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Local Development

### Prerequisites
- Node.js 18+ and npm
- A Supabase project ([supabase.com](https://supabase.com))
- Resend account for email ([resend.com](https://resend.com))

### Setup

```sh
# Clone the repo
git clone https://github.com/shanethor/doug-shane.git
cd doug-shane

# Install dependencies
npm install

# Copy environment variables and fill in your values
cp .env.example .env

# Start the dev server (runs on :8080)
npm run dev
```

### Available Scripts

```sh
npm run dev       # Start dev server with HMR
npm run build     # Production build
npm run lint      # ESLint
npm run test      # Vitest unit tests
```

---

## Environment Variables

Create a `.env` file at the project root:

```env
# Supabase (required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

The following secrets must also be set in **Supabase → Edge Functions → Secrets**:

| Secret | Purpose |
|---|---|
| `RESEND_API_KEY` | Transactional email (intake forms, 2FA, lead questionnaire) |
| `GOOGLE_CLIENT_ID` | Gmail OAuth |
| `GOOGLE_CLIENT_SECRET` | Gmail OAuth |
| `MICROSOFT_CLIENT_ID` | Outlook OAuth |
| `MICROSOFT_CLIENT_SECRET` | Outlook OAuth |
| `SERPER_API_KEY` | Web search for lead enrichment |
| `APOLLO_API_KEY` | Apollo.io contact database |
| `PDL_API_KEY` | People Data Labs fallback enrichment |
| `LOVABLE_API_KEY` | Gemini AI for email composition |
| `SITE_URL` | Public URL (`https://buildingaura.site`) |
| `APP_URL` | App URL (same as SITE_URL or Lovable preview URL) |

---

## Supabase Edge Functions

All serverless business logic lives in `supabase/functions/`. Key functions:

| Function | Description |
|---|---|
| `send-lead-questionnaire` | Sends interest verification email to an engine lead (test mode → shanebaseball08@gmail.com) |
| `submit-lead-questionnaire` | Public handler for lead questionnaire responses |
| `send-intake-link-email` | Emails a personal lines intake link to a client |
| `send-personal-intake-email` | Notifies agent when client submits an intake form |
| `email-sync` | Gmail/Outlook sync + send via connected OAuth account |
| `compose-email` | AI email drafting |
| `enrich-lead` | Contact discovery waterfall: Serper → Apollo → PDL |
| `verify-2fa` | Sends and verifies 2FA codes via email |
| `approve-user` | Admin user approval flow |
| `clark-notify` | Clark quoting integration notifications |
| `send-loss-run` | Loss run request emails to carriers |
| `complete-bor-signing` | Broker of Record letter completion |
| `spotlight-flyer` | AI outreach draft generation |
| `connection-brief` | AI context brief for outreach |

### Deploying Edge Functions

```sh
# Deploy a single function
supabase functions deploy send-lead-questionnaire

# Deploy all functions
supabase functions deploy
```

---

## Database Migrations

Migrations live in `supabase/migrations/`. To apply:

1. Go to **Supabase Dashboard → SQL Editor**
2. Paste and run the contents of any unapplied migration file
3. Or use the Supabase CLI: `supabase db push`

### Key Tables

| Table | Purpose |
|---|---|
| `engine_leads` | AI-discovered prospects with scores, signals, questionnaire state |
| `leads` | Pipeline leads (converted from engine leads or created manually) |
| `personal_intake_submissions` | Client intake form data |
| `intake_links` | Commercial intake form tokens |
| `email_drafts` | Sent/drafted emails logged for each lead |
| `profiles` | User profiles, agency info, delivery preferences |
| `agencies` | Agency records |
| `trusted_devices` | 2FA device trust (7-day expiry) |
| `two_factor_codes` | 2FA codes (10-min expiry) |

---

## Lead Questionnaire Flow

A verification flow for engine leads to confirm interest:

1. Agent opens a lead in `/connect/leads` and clicks **Send Verification Email**
2. `send-lead-questionnaire` edge function fires — generates a unique token, saves it on the lead, sends email via Resend
3. Lead receives email with 3 one-click buttons: **Yes / Maybe / No**
4. Clicking a button hits `/lead-verify/:token?response=yes` (public page)
5. `submit-lead-questionnaire` updates the lead: sets `questionnaire_response`, marks `verified = true` if Yes or Maybe, updates `status` to `interested`
6. Lead detail page in-app shows the response and verified badge

> **Test mode:** Currently all questionnaire emails route to `shanebaseball08@gmail.com` regardless of the real lead email. Set `TEST_MODE = false` in `send-lead-questionnaire/index.ts` to go live.

Leads with no email address appear in the **No Email** tab at `/connect/leads` with a Find Email button to run the enrichment waterfall.

---

## Authentication

- Supabase Auth (email/password)
- 2FA via email OTP (`verify-2fa` function, Resend)
- Device trust: 7-day remember-me per device hash
- Some accounts bypass 2FA (configured in `ProductAuth.tsx`)
- Gmail/Outlook connected via OAuth — tokens stored encrypted in DB, auto-refreshed

---

## Chrome Extension

Located in `extension/`. Syncs LinkedIn profile analytics (views, impressions, demographics) to AURA Connect.

- **Manifest V3**
- Content scripts target LinkedIn pages
- Posts data to Supabase via the REST API

To load in development: Chrome → Extensions → Load unpacked → select `extension/`

---

## Deployment

The app is deployed via [Lovable](https://lovable.dev) at [buildingaura.site](https://buildingaura.site).

Pushes to `main` automatically trigger a redeploy. Edge functions must be deployed separately via the Supabase CLI or dashboard.

---

## Contributing

1. Branch off `main`
2. Make changes locally with `npm run dev`
3. Run `npm run lint` before committing
4. Push and open a PR — merges to `main` deploy automatically

---

## Contact

**Shane Thor** — shane@houseofthor.com  
[buildingaura.site](https://buildingaura.site)
