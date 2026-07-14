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

### Workflow JSON files

All workflow exports live in `n8n/workflows/`. Import them in n8n (**Workflows → Import from file**) or deploy with the scripts below.

| File | Workflow | Import order | Notes |
|------|----------|--------------|-------|
| [`00-bootstrap-tables.json`](n8n/workflows/00-bootstrap-tables.json) | GMB 00 — Bootstrap Data Tables | **1st** | Creates all 5 data tables (idempotent). Or trigger via webhook instead of manual import. |
| [`02-send-review-email.json`](n8n/workflows/02-send-review-email.json) | GMB 02 — Send Review Email | **2nd** | Sub-workflow called by WF1. Connect **Gmail OAuth2** on the **Send Gmail** node before activating. |
| [`01-api-gateway.json`](n8n/workflows/01-api-gateway.json) | GMB 01 — API Gateway (source) | — | **Do not import directly.** Template only — run `build-workflows.ts` first. |
| [`01-api-gateway.built.json`](n8n/workflows/01-api-gateway.built.json) | GMB 01 — API Gateway (built) | **3rd** | Generated file with embedded API handler. Import this after WF2 is active. |

**Manual import order:** WF0 (bootstrap) → WF2 (email + Gmail credential) → build WF1 → import `01-api-gateway.built.json`.

### Live workflows (production)

| # | Name | ID | Trigger | Purpose |
|---|------|-----|---------|---------|
| **00** | GMB 00 — Bootstrap Data Tables | `rpwjv8ifZBMOFKO6` | Webhook `POST /gmb-bootstrap-tables` | Creates 5 data tables (idempotent) |
| **01** | GMB 01 — API Gateway | `RLUvK1DNXdxcaBHh` | Webhook `POST /gmb-api` | All app CRUD + queue email jobs |
| **02** | GMB 02 — Send Review Email | `s9ykb6ChP9lPlVik` | Sub-workflow | Sends Gmail when lead is queued |

**Webhook URLs (production):**

- API: `https://n8n.fusionsync.ai/webhook/gmb-api`
- Bootstrap: `https://n8n.fusionsync.ai/webhook/gmb-bootstrap-tables`

### Data tables

Created via bootstrap workflow (not REST API — `POST /api/v1/data-tables` returns 500 on this instance). Column definitions are in [`n8n/tables-schema.json`](n8n/tables-schema.json).

| Table | ID | Columns |
|-------|-----|---------|
| `gmb_businesses` | `OMDmnoiYdMPmKNXK` | `id`, `slug`, `name`, `place_id`, `logo_url`, `owner_email`, `created_at` |
| `gmb_services` | `CeHwZiH8oZm5w2Xm` | `id`, `business_id`, `name`, `slug`, `email_subject`, `email_body`, `created_at` |
| `gmb_leads` | `Wh0KbIpBHvunIqwK` | `id`, `business_id`, `name`, `email`, `service_id`, `status`, `review_token`, `notes`, `queued_at`, `sent_at`, `opened_at`, `reviewed_at`, `created_at` |
| `gmb_reviews` | `ZWIVEwVM63o9PBrW` | `id`, `lead_id`, `business_id`, `rating`, `comment`, `redirected_to_gmb`, `created_at` |
| `gmb_activity_logs` | `531cgpCpPmkR8nWP` | `id`, `business_id`, `lead_id`, `event`, `detail`, `metadata`, `created_at` |

Re-create tables anytime:

```bash
curl -X POST https://n8n.fusionsync.ai/webhook/gmb-bootstrap-tables
```

> n8n reserves a built-in row `id`. Custom UUIDs are stored in `record_id`.

After bootstrap, copy table IDs into `n8n/gmb-config.json` (from `gmb-config.example.json`) so `build-workflows.ts` can embed them into WF1.

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

Config lives in `n8n/gmb-config.json` (gitignored — copy from [`gmb-config.example.json`](n8n/gmb-config.example.json)):

```json
{
  "tables": {
    "businesses": "<gmb_businesses table ID>",
    "services": "<gmb_services table ID>",
    "leads": "<gmb_leads table ID>",
    "reviews": "<gmb_reviews table ID>",
    "logs": "<gmb_activity_logs table ID>"
  },
  "n8nBaseUrl": "https://n8n.fusionsync.ai",
  "n8nApiKey": "your-n8n-api-key",
  "gmbApiKey": "gmb-dev-secret-change-me",
  "appUrl": "http://localhost:3000"
}
```

### Gmail OAuth — Google Cloud Console → n8n

Review emails are sent by **WF2** via the **Send Gmail** node. You must create a Google OAuth app and connect it in n8n before queuing leads.

#### 1. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) → create or select a project.
2. **APIs & Services → Library** → search **Gmail API** → **Enable**.
3. **APIs & Services → OAuth consent screen**
   - User type: **External** (or Internal if using Google Workspace)
   - App name, support email, developer contact
   - Scopes: add `https://www.googleapis.com/auth/gmail.send` (or `gmail.modify` for full send access)
   - If app is in **Testing**, add your sender Gmail under **Test users**
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized redirect URIs** — add your n8n callback URL:

     ```
     https://n8n.fusionsync.ai/rest/oauth2-credential/callback
     ```

     For local n8n, use `http://localhost:5678/rest/oauth2-credential/callback` instead.

5. Copy the **Client ID** and **Client Secret**.

#### 2. n8n credential

1. n8n → **Credentials → Add credential → Gmail OAuth2**
2. Paste **Client ID** and **Client Secret**
3. Click **Sign in with Google** and authorize the Gmail account that will send review emails
4. Save the credential

#### 3. Attach to WF2

1. Open **GMB 02 — Send Review Email** → **Send Gmail** node
2. Select your **Gmail OAuth2** credential (not the placeholder `CONFIGURE_GMAIL`)
3. Confirm **Email Type** is **HTML** (static value — do not use an expression)
4. **Activate** the workflow

#### Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Forbidden - perhaps check your credentials?` | Reconnect Gmail OAuth2 in n8n; ensure redirect URI matches exactly |
| `Gmail credential unavailable` | Open WF2 → Send Gmail → re-select credential after deploy |
| OAuth redirect mismatch | Redirect URI in Google Console must match n8n’s `/rest/oauth2-credential/callback` |
| App blocked / 403 | Add sender email as a **Test user** while consent screen is in Testing mode |

If Gmail is not connected, queued emails fail and the lead status moves to **failed** (use **Retry** on the Leads page to resend).

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
