#!/usr/bin/env bun
/**
 * Cold-test n8n workflows via the live webhook.
 * Run: bun n8n/scripts/test-workflows.ts
 */
const WEBHOOK = process.env.N8N_WEBHOOK_URL ?? "https://n8n.fusionsync.ai/webhook/gmb-api";
const API_KEY = process.env.N8N_API_KEY ?? "gmb-dev-secret-change-me";
const BOOTSTRAP =
  process.env.N8N_BOOTSTRAP_URL ??
  "https://n8n.fusionsync.ai/webhook/gmb-bootstrap-tables";

async function call(url: string, body: Record<string, unknown> = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

const tests: Array<{ name: string; run: () => Promise<{ status: number; data: unknown }> }> = [
  {
    name: "WF1 health",
    run: () => call(WEBHOOK, { action: "health" }),
  },
  {
    name: "WF1 business.get",
    run: () => call(WEBHOOK, { action: "business.get", slug: "fusionsync-demo" }),
  },
  {
    name: "WF1 stats.get",
    run: () => call(WEBHOOK, { action: "stats.get", slug: "fusionsync-demo" }),
  },
  {
    name: "WF1 service.list",
    run: () => call(WEBHOOK, { action: "service.list", slug: "fusionsync-demo" }),
  },
  {
    name: "WF1 lead.list",
    run: () => call(WEBHOOK, { action: "lead.list", slug: "fusionsync-demo" }),
  },
  {
    name: "WF00 bootstrap tables (idempotent)",
    run: () => call(BOOTSTRAP, {}),
  },
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  const result = await test.run();
  const ok = result.status === 200 && !(result.data as { error?: string })?.error;
  if (ok) {
    passed++;
    console.log(`✓ ${test.name}`);
  } else {
    failed++;
    console.log(`✗ ${test.name} → ${result.status}`, result.data);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
