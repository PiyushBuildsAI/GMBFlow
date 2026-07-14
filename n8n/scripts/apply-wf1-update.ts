#!/usr/bin/env bun
/**
 * Push 01-api-gateway.built.json to n8n (run build-workflows.ts first).
 */
import { readFileSync } from "fs";
import { join } from "path";

const WF1_ID = "RLUvK1DNXdxcaBHh";
const WF2_ID = "s9ykb6ChP9lPlVik";

const mcp = JSON.parse(
  readFileSync(join(import.meta.dir, "../../.cursor/mcp.json"), "utf8")
);
const env = mcp.mcpServers["n8n-mcp"].env;
const gateway = JSON.parse(
  readFileSync(join(import.meta.dir, "../workflows/01-api-gateway.built.json"), "utf8")
);

const exec = gateway.nodes.find((n: { name: string }) => n.name === "Send Review Email WF");
if (exec) exec.parameters.workflowId = WF2_ID;

const payload = {
  name: gateway.name,
  nodes: gateway.nodes,
  connections: gateway.connections,
  settings: gateway.settings,
};

const res = await fetch(
  `${env.N8N_API_URL.replace(/\/$/, "")}/api/v1/workflows/${WF1_ID}`,
  {
    method: "PUT",
    headers: {
      "X-N8N-API-KEY": env.N8N_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }
);

const text = await res.text();
if (!res.ok) throw new Error(`${res.status}: ${text}`);
console.log("Updated WF1 from 01-api-gateway.built.json");
