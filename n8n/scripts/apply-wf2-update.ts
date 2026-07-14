#!/usr/bin/env bun
import { readFileSync } from "fs";
import { join } from "path";

const mcp = JSON.parse(
  readFileSync(join(import.meta.dir, "../../.cursor/mcp.json"), "utf8")
);
const env = mcp.mcpServers["n8n-mcp"].env;
const base = env.N8N_API_URL.replace(/\/$/, "");
const headers = {
  "X-N8N-API-KEY": env.N8N_API_KEY,
  "Content-Type": "application/json",
};

type WorkflowNode = {
  id?: string;
  name: string;
  credentials?: Record<string, { id: string; name: string }>;
  webhookId?: string;
  [key: string]: unknown;
};

const id = process.argv[2] || "s9ykb6ChP9lPlVik";
const template = JSON.parse(
  readFileSync(join(import.meta.dir, "../workflows/02-send-review-email.json"), "utf8")
);

const remoteRes = await fetch(`${base}/api/v1/workflows/${id}`, { headers });
const remoteText = await remoteRes.text();
if (!remoteRes.ok) throw new Error(`GET ${remoteRes.status}: ${remoteText}`);
const remote = JSON.parse(remoteText) as { nodes: WorkflowNode[] };

const remoteByName = new Map(remote.nodes.map((node) => [node.name, node]));
const nodes = template.nodes.map((node: WorkflowNode) => {
  const existing = remoteByName.get(node.name);
  if (!existing) return node;

  const merged: WorkflowNode = { ...node };
  if (existing.credentials) merged.credentials = existing.credentials;
  if (existing.webhookId && node.name === "Send Gmail") {
    merged.webhookId = existing.webhookId;
  }
  return merged;
});

const payload = {
  name: template.name,
  nodes,
  connections: template.connections,
  settings: template.settings,
};

const res = await fetch(`${base}/api/v1/workflows/${id}`, {
  method: "PUT",
  headers,
  body: JSON.stringify(payload),
});

const text = await res.text();
if (!res.ok) throw new Error(`${res.status}: ${text}`);

const gmail = nodes.find((n: WorkflowNode) => n.name === "Send Gmail");
const credId = gmail?.credentials?.gmailOAuth2?.id;
console.log("Updated WF2 — Send Review Email");
if (!credId || credId === "CONFIGURE_GMAIL") {
  console.warn(
    "WARNING: Gmail credential not connected. Open WF2 → Send Gmail → select your Gmail OAuth2 credential in n8n."
  );
} else {
  console.log(`Preserved Gmail credential: ${credId}`);
}
