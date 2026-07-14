# GMBFlow — Google Review Management

GMBFlow is a Next.js dashboard for managing Google Business review requests. Businesses onboard clients, tag them by service, queue review emails via n8n, and collect ratings on a branded review page.

- **4–5 stars** → saved and redirected to Google Business
- **1–3 stars** → saved internally only (no public redirect)
- **Duplicate guard** → no re-send or second submission for already-reviewed leads

Built with [Next.js 16](https://nextjs.org), [shadcn/ui](https://ui.shadcn.com), [Geist](https://vercel.com/font), and [n8n](https://n8n.io).

---

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/PiyushBuildsAI/GMBFlow.git
cd GMBFlow
bun install
```

### 2. Environment variables

Copy `.env.example` to `.env.local`:

```env
N8N_WEBHOOK_URL=https://n8n.fusionsync.ai/webhook/gmb-api
N8N_API_KEY=gmb-dev-secret-change-me
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

| Variable | Description |
|----------|-------------|
| `N8N_WEBHOOK_URL` | Production webhook for **GMB 01 — API Gateway** |
| `N8N_API_KEY` | Shared secret sent as `X-API-Key` header |
| `NEXT_PUBLIC_APP_URL` | Public URL for review links in emails |

### 3. Run the app

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) → **Create your workspace** → dashboard at `/b/{slug}`.

---

## n8n setup

All automation runs on your n8n instance at `https://n8n.fusionsync.ai`.

### MCP (Cursor)

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": ["-y", "n8n-mcp"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "DISABLE_CONSOLE_OUTPUT": "true",
        "N8N_API_URL": "https://n8n.fusionsync.ai",
        "N8N_API_KEY": "your-n8n-api-key"
      }
    }
  }
}
```

In Cursor, the server appears as **`project-0-gmb-n8n-mcp`**. Toggle MCP off/on in Settings if tools disconnect.

### Workflows

| # | Name | ID | Trigger | Purpose |
|---|------|-----|---------|---------|
| **00** | GMB 00 — Bootstrap Data Tables | `rpwjv8ifZBMOFKO6` | Webhook `POST /gmb-bootstrap-tables` | Creates 5 data tables (idempotent) |
| **01** | GMB 01 — API Gateway | `RLUvK1DNXdxcaBHh` | Webhook `POST /gmb-api` | All app CRUD + queue email jobs |
| **02** | GMB 02 — Send Review Email | `s9ykb6ChP9lPlVik` | Sub-workflow | Sends Gmail when lead is queued |

**Webhook URLs (production):**

- API: `https://n8n.fusionsync.ai/webhook/gmb-api`
- Bootstrap: `https://n8n.fusionsync.ai/webhook/gmb-bootstrap-tables`

### Data tables

Created via bootstrap workflow (not REST API — `POST /api/v1/data-tables` returns 500 on this instance).

| Table | ID |
|-------|-----|
| `gmb_businesses` | `OMDmnoiYdMPmKNXK` |
| `gmb_services` | `CeHwZiH8oZm5w2Xm` |
| `gmb_leads` | `Wh0KbIpBHvunIqwK` |
| `gmb_reviews` | `ZWIVEwVM63o9PBrW` |
| `gmb_activity_logs` | `531cgpCpPmkR8nWP` |

Re-create tables anytime:

```bash
curl -X POST https://n8n.fusionsync.ai/webhook/gmb-bootstrap-tables
```

> n8n reserves a built-in row `id`. Custom UUIDs are stored in `record_id`.

**Current storage:** WF1 uses **n8n Data Tables** (`gmb_businesses`, `gmb_leads`, etc.). Existing workflow static data is migrated automatically on first API call after deploy.

### Deploy / update workflows

```bash
# Build WF1 with embedded API handler
bun n8n/scripts/build-workflows.ts

# Push to n8n (reads 01-api-gateway.built.json — always run build first!)
bun n8n/scripts/apply-wf1-update.ts
bun n8n/scripts/apply-wf2-update.ts
bun n8n/scripts/apply-bootstrap-update.ts rpwjv8ifZBMOFKO6
```

Config lives in `n8n/gmb-config.json` (gitignored — copy from `gmb-config.example.json`).

### Gmail on WF2

1. n8n → **Credentials** → **Gmail OAuth2** (connect a Google account)
2. Open **GMB 02 — Send Review Email** → **Send Gmail** node → select credential
3. Activate workflow

If Gmail is not connected, queued emails fail with `Forbidden - perhaps check your credentials?` and the lead status moves to **failed** (use **Retry** to resend).

### Import deduplication

CSV import skips rows whose **email already exists** for that business. The UI shows how many were imported vs skipped as duplicates.

### Delete leads

Select one or more leads on the Leads page and click **Delete** to remove them permanently.

### Cold-test workflows

```bash
bun n8n/scripts/test-workflows.ts
```

Tests health, business/stats/leads endpoints, and bootstrap idempotency against the live instance.

---

## App routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/workspaces` | List and open existing business dashboards |
| `/onboard` | 3-step business onboarding wizard |
| `/b/{slug}` | Dashboard overview (stats + [shadcn area charts](https://ui.shadcn.com/charts/area)) |
| `/b/{slug}/leads` | Lead management — add, **import CSV file**, queue, **delete**, retry |
| `/b/{slug}/services` | Email templates per service |
| `/b/{slug}/logs` | Activity log |
| `/b/{slug}/settings` | Business settings |
| `/review/{token}` | Branded customer review page |

---

## Lead import (CSV file upload)

On **Leads**, click **Import CSV** and upload a `.csv` file (drag-and-drop supported).

**Required:** name + email  
**Optional:** service tag, notes (assign service later in the dashboard)

Supported header formats:

```csv
Business Name,Email
Bright Pixel Studio,hello@example.com
```

or

```csv
name,email,service,notes
John Doe,john@example.com,Dev,Project X
```

If a service tag is provided it must match an existing service name. Leads without a service show an **Assign service** dropdown in the table before you can queue them.

---

## Review flow

```
Onboard business → Add/import leads → Queue for review
        ↓
   n8n WF1 (API Gateway) marks lead queued, triggers WF2
        ↓
   n8n WF2 sends Gmail with /review/{token} link
        ↓
   Customer opens review page → submits 1–5 stars
        ↓
   4–5 stars: redirect to Google Business | 1–3 stars: internal only
```

---

## Tech stack

- **Framework:** Next.js 16, React 19, TypeScript
- **UI:** shadcn/ui (base-nova), Tailwind v4, [Geist font](https://vercel.com/font)
- **Charts:** Recharts via [shadcn charts](https://ui.shadcn.com/charts/area)
- **Backend:** n8n webhooks (no auth — slug-based workspace access)
- **Package manager:** Bun

---

## Project structure

```
app/                    # Next.js routes
components/
  dashboard/            # Stats, charts, leads, import
  layout/               # Sidebar, shell, header
  review/               # Branded review page
  ui/                   # shadcn components
lib/                    # API client, types, utils
n8n/
  workflows/            # Workflow JSON exports
  scripts/              # Build, deploy, test scripts
  tables-schema.json    # Data table column definitions
```

---

## Development

```bash
bun dev          # Start dev server
bun run build    # Production build
bun run lint     # ESLint
```

---

## License

Private — FusionSync
