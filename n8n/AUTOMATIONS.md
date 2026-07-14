# n8n Automations — 2 Workflows (WF3 skipped)

## Workflow 1 — API Gateway (Webhook)

**Trigger:** `POST /webhook/gmb-api`

```
Next.js  →  Webhook  →  Code (API Handler)  →  Respond to Webhook
                              │
                              └── IF email jobs  →  Execute WF2
```

**Stores everything in Data Tables:**
- `gmb_businesses`, `gmb_services`, `gmb_leads`, `gmb_reviews`, `gmb_activity_logs`

**Key actions:**

| Action | When used |
|--------|-----------|
| `business.create` | Onboarding |
| `lead.create` / `lead.import` | Add leads |
| `lead.update_status` → `queued` | Triggers WF2 email |
| `review.get_lead` | Client opens review page |
| `review.submit` | Client submits rating |
| `log.list` / `stats.get` | Dashboard |

Code: `api-handler-datatables.js`

---

## Workflow 2 — Send Review Email (Gmail)

**Trigger:** Called by WF1 when lead status → `queued`

```
Get Lead  →  Is queued?  →  Get Service Template  →  Build Email
    →  Send Gmail  →  Mark sent  →  Log email.sent
                  └─ (on error) →  Mark failed  →  Log email.failed
```

**Email contains:** `{{GMB_APP_URL}}/review/{review_token}`

**Duplicate guard:** WF1 skips leads already `sent`, `opened`, `reviewed`, or `queued`

---

## WF3 — Low Rating Alert

**Skipped.** Low ratings saved internally only.

---

## Deploy

```bash
bun n8n/scripts/build-workflows.ts
N8N_API_URL=https://n8n.fusionsync.ai N8N_API_KEY=xxx bun n8n/scripts/deploy.ts
```

See `README.md` for full setup.
