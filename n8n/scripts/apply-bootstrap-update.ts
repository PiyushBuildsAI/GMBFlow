#!/usr/bin/env bun
import { readFileSync } from "fs";
import { join } from "path";

const mcp = JSON.parse(
  readFileSync(join(import.meta.dir, "../../.cursor/mcp.json"), "utf8")
);
const env = mcp.mcpServers["n8n-mcp"].env;
const workflow = JSON.parse(
  readFileSync(join(import.meta.dir, "../workflows/00-bootstrap-tables.json"), "utf8")
);

const id = process.argv[2] || "rpwjv8ifZBMOFKO6";
const payload = {
  name: workflow.name,
  nodes: workflow.nodes,
  connections: workflow.connections,
  settings: workflow.settings,
};

const res = await fetch(
  `${env.N8N_API_URL.replace(/\/$/, "")}/api/v1/workflows/${id}`,
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
console.log("Updated bootstrap workflow");
