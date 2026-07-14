# n8n Setup — 2 Workflows (WF3 skipped)

## MCP deployment status (2026-07-14)

| Item | Status |
|------|--------|
| **MCP connection** | ✅ Working — server ID in Cursor is `project-0-gmb-n8n-mcp` |
| **GMB 00 — Bootstrap Data Tables** (`rpwjv8ifZBMOFKO6`) | ✅ Active |
| **GMB 01 — API Gateway** (`RLUvK1DNXdxcaBHh`) | ✅ Active (workflow static data) |
| **GMB 02 — Send Review Email** (`s9ykb6ChP9lPlVik`) | ✅ Active |
| **Data tables (5)** | ✅ Created via bootstrap workflow |

### Data table IDs

| Table | ID |
|-------|-----|
| `gmb_businesses` | `OMDmnoiYdMPmKNXK` |
| `gmb_services` | `CeHwZiH8oZm5w2Xm` |
| `gmb_leads` | `Wh0KbIpBHvunIqwK` |
| `gmb_reviews` | `ZWIVEwVM63o9PBrW` |
| `gmb_activity_logs` | `531cgpCpPmkR8nWP` |

### MCP troubleshooting

Your `.cursor/mcp.json` is **correct**. If MCP tools fail:

1. In Cursor, the registered server name is `project-0-gmb-n8n-mcp` (not `n8n-mcp`)
2. Toggle MCP off/on in Cursor Settings → MCP if tools show disconnected
3. `POST /api/v1/data-tables` returns **500** on this instance — use the bootstrap workflow instead:
   ```bash
   curl -X POST https://n8n.fusionsync.ai/webhook/gmb-bootstrap-tables
   ```

Note: n8n reserves a built-in `id` column on data tables. Custom UUIDs are stored in `record_id`.

---

## What gets deployed

| Workflow | Type | Purpose |
|----------|------|---------|
| **GMB 01 — API Gateway** | Webhook `POST /gmb-api` | All app CRUD → Data Tables |
| **GMB 02 — Send Review Email** | Sub-workflow + Gmail | Sends review link when lead queued |

---

## Option A — Deploy script (fastest)

```bash
# 1. Build workflow with embedded API handler code
bun n8n/scripts/build-workflows.ts

# 2. Deploy to your n8n instance
N8N_API_URL=https://n8n.fusionsync.ai \
N8N_API_KEY=your-n8n-api-key \
bun n8n/scripts/deploy.ts
```

The deploy script will print your webhook URL and workflow IDs.

---

## Option B — Manual import in n8n UI

### Step 1 — Create Data Tables

n8n → **Data** → **Data tables** → create 5 tables from `tables-schema.json`:

- `gmb_businesses`
- `gmb_services`
- `gmb_leads`
- `gmb_reviews`
- `gmb_activity_logs`

Copy each table ID.

### Step 2 — Set n8n Variables

Settings → Variables:

```
GMB_TABLE_BUSINESSES=<id>
GMB_TABLE_SERVICES=<id>
GMB_TABLE_LEADS=<id>
GMB_TABLE_REVIEWS=<id>
GMB_TABLE_LOGS=<id>
GMB_APP_URL=http://localhost:3000
GMB_API_KEY=your-shared-secret
N8N_BASE_URL=https://n8n.fusionsync.ai
N8N_API_KEY=your-n8n-api-key
GMB_WF_SEND_EMAIL_ID=<set after step 3>
```

### Step 3 — Import WF2 (email) first

1. Import `workflows/02-send-review-email.json`
2. Open **Send Gmail** node → connect your **Gmail OAuth2** credential
3. Activate workflow → copy workflow ID → set `GMB_WF_SEND_EMAIL_ID`

### Step 4 — Import WF1 (API gateway)

```bash
bun n8n/scripts/build-workflows.ts
```

1. Import `workflows/01-api-gateway.built.json`
2. Activate workflow
3. Copy production webhook URL: `https://n8n.fusionsync.ai/webhook/gmb-api`

### Step 5 — Connect Next.js

`.env.local`:

```env
N8N_WEBHOOK_URL=https://n8n.fusionsync.ai/webhook/gmb-api
N8N_API_KEY=your-shared-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
bun dev
```

---

## Gmail credential setup in n8n

1. n8n → **Credentials** → **Add credential** → **Gmail OAuth2**
2. Follow Google OAuth setup (Google Cloud Console → enable Gmail API)
3. On WF2 **Send Gmail** node → select the credential
4. Test by queuing a lead in the dashboard

---

## Test flow

1. `/onboard` → create business
2. `/b/{slug}/leads` → add lead with your own email
3. Select lead → **Queue for Review**
4. Check n8n **Executions** → WF1 + WF2 should run
5. Check inbox → email with `/review/{token}` link
6. Open link → submit rating

---

## WF3 (Low Rating Alert) — skipped per request

Low ratings (1–3 stars) are saved to `gmb_reviews` and logged in `gmb_activity_logs` only. No alert email is sent.
