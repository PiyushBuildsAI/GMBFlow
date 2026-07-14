#!/usr/bin/env bun
/**
 * Deploy GMB workflows to n8n via API
 *
 * Usage:
 *   N8N_API_URL=https://n8n.fusionsync.ai \
 *   N8N_API_KEY=your-key \
 *   bun n8n/scripts/deploy.ts
 */
import { readFileSync } from "fs";
import { join } from "path";

const API_URL = (process.env.N8N_API_URL || "").replace(/\/$/, "");
const API_KEY = process.env.N8N_API_KEY || "";

if (!API_URL || !API_KEY) {
  console.error("Set N8N_API_URL and N8N_API_KEY environment variables");
  process.exit(1);
}

const root = join(import.meta.dir, "..");

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    method,
    headers: {
      "X-N8N-API-KEY": API_KEY,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return data as Record<string, unknown>;
}

async function deployWorkflow(file: string, name: string) {
  const workflow = JSON.parse(readFileSync(join(root, "workflows", file), "utf8"));
  workflow.name = name;
  workflow.active = true;

  const existing = (await api("GET", "/workflows?limit=100")) as {
    data?: Array<{ id: string; name: string }>;
  };
  const found = existing.data?.find((w) => w.name === name);

  if (found) {
    console.log(`Updating workflow: ${name} (${found.id})`);
    const updated = await api("PUT", `/workflows/${found.id}`, workflow);
    await api("POST", `/workflows/${found.id}/activate`);
    return updated;
  }

  console.log(`Creating workflow: ${name}`);
  const created = await api("POST", "/workflows", workflow);
  const id = created.id as string;
  await api("POST", `/workflows/${id}/activate`);
  return created;
}

// Build gateway first
await import("./build-workflows.ts");

console.log("\nDeploying GMB workflows (WF3 skipped)...\n");

const emailWf = await deployWorkflow(
  "02-send-review-email.json",
  "GMB 02 — Send Review Email"
);
console.log(`✓ Email workflow ID: ${emailWf.id}`);
console.log(`  → Set n8n variable GMB_WF_SEND_EMAIL_ID=${emailWf.id}\n`);

const gatewayWf = await deployWorkflow(
  "01-api-gateway.built.json",
  "GMB 01 — API Gateway"
);
console.log(`✓ API Gateway workflow ID: ${gatewayWf.id}`);
console.log(`  → Webhook URL: ${API_URL}/webhook/gmb-api\n`);

console.log("Done! Next steps:");
console.log("1. Create 5 Data Tables (see tables-schema.json)");
console.log("2. Set n8n variables: GMB_TABLE_*, GMB_APP_URL, GMB_API_KEY, GMB_WF_SEND_EMAIL_ID");
console.log("3. Connect Gmail credential on 'Send Gmail' node in WF2");
console.log("4. Add to .env.local:");
console.log(`   N8N_WEBHOOK_URL=${API_URL}/webhook/gmb-api`);
