#!/usr/bin/env bun
/**
 * Create GMB data tables via n8n REST API and set instance variables.
 */
import { readFileSync } from "fs";
import { join } from "path";

const mcp = JSON.parse(
  readFileSync(join(import.meta.dir, "../../.cursor/mcp.json"), "utf8")
);
const { N8N_API_URL, N8N_API_KEY } = mcp.mcpServers["n8n-mcp"].env;
const BASE = N8N_API_URL.replace(/\/$/, "");

const schema = JSON.parse(
  readFileSync(join(import.meta.dir, "../tables-schema.json"), "utf8")
);

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    ...init,
    headers: {
      "X-N8N-API-KEY": N8N_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers as Record<string, string>),
    },
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`${init.method || "GET"} ${path} → ${res.status}: ${text}`);
  }
  return body as Record<string, unknown>;
}

// List existing tables
const existing = (await api("/data-tables?limit=100")) as {
  data?: Array<{ id: string; name: string }>;
};
const byName = new Map(
  (existing.data ?? []).map((t) => [t.name, t.id])
);

const tableIds: Record<string, string> = {};

for (const table of schema.tables) {
  if (byName.has(table.name)) {
    tableIds[table.name] = byName.get(table.name)!;
    console.log(`exists: ${table.name} → ${tableIds[table.name]}`);
    continue;
  }
  const created = (await api("/data-tables", {
    method: "POST",
    body: JSON.stringify({
      name: table.name,
      columns: table.columns.map((c: { name: string; type: string }) => ({
        name: c.name,
        type: c.type,
      })),
    }),
  })) as { id: string; name: string };
  tableIds[table.name] = created.id;
  console.log(`created: ${table.name} → ${created.id}`);
}

const varMap: Record<string, string> = {
  GMB_TABLE_BUSINESSES: tableIds.gmb_businesses,
  GMB_TABLE_SERVICES: tableIds.gmb_services,
  GMB_TABLE_LEADS: tableIds.gmb_leads,
  GMB_TABLE_REVIEWS: tableIds.gmb_reviews,
  GMB_TABLE_LOGS: tableIds.gmb_activity_logs,
  GMB_APP_URL: process.env.GMB_APP_URL || "http://localhost:3000",
  GMB_API_KEY: process.env.GMB_API_KEY || "gmb-dev-secret-change-me",
  N8N_BASE_URL: BASE,
  N8N_API_KEY: N8N_API_KEY,
  GMB_WF_SEND_EMAIL_ID: "s9ykb6ChP9lPlVik",
};

// Upsert variables
const vars = (await api("/variables?limit=100")) as {
  data?: Array<{ id: string; key: string; value: string }>;
};
const existingVars = new Map((vars.data ?? []).map((v) => [v.key, v]));

for (const [key, value] of Object.entries(varMap)) {
  const found = existingVars.get(key);
  if (found) {
    await api(`/variables/${found.id}`, {
      method: "PATCH",
      body: JSON.stringify({ value }),
    });
    console.log(`updated var: ${key}`);
  } else {
    await api("/variables", {
      method: "POST",
      body: JSON.stringify({ key, value }),
    });
    console.log(`created var: ${key}`);
  }
}

console.log("\nTable IDs:");
for (const [name, id] of Object.entries(tableIds)) {
  console.log(`  ${name}: ${id}`);
}
