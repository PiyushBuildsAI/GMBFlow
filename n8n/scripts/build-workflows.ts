#!/usr/bin/env bun
/**
 * Embeds api-handler-datatables.js + gmb-config.json into 01-api-gateway.json
 * Run: bun n8n/scripts/build-workflows.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const root = join(import.meta.dir, "..");
const config = JSON.parse(readFileSync(join(root, "gmb-config.json"), "utf8"));
const handlerCode = readFileSync(join(root, "api-handler-datatables.js"), "utf8").replace(
  "__GMB_CONFIG__",
  JSON.stringify(config)
);
const gateway = JSON.parse(
  readFileSync(join(root, "workflows/01-api-gateway.json"), "utf8")
);

const handlerNode = gateway.nodes.find((n: { name: string }) => n.name === "API Handler");
if (!handlerNode) throw new Error("API Handler node not found");
handlerNode.parameters.jsCode = handlerCode;

// Remove WF3 nodes
gateway.nodes = gateway.nodes.filter(
  (n: { name: string }) => !["Low Rating?", "Low Rating Alert WF"].includes(n.name)
);
if (gateway.connections["API Handler"]) {
  gateway.connections["API Handler"].main[0] = gateway.connections["API Handler"].main[0].filter(
    (c: { node: string }) => !["Low Rating?", "Low Rating Alert WF"].includes(c.node)
  );
}
delete gateway.connections["Low Rating?"];
delete gateway.connections["Low Rating Alert WF"];

const prepareNode = gateway.nodes.find((n: { name: string }) => n.name === "Prepare Response");
if (prepareNode) {
  prepareNode.parameters.jsCode =
    "const data = $('API Handler').first().json;\nconst { _emailJobs, ...response } = data;\nreturn [{ json: response }];";
}

writeFileSync(
  join(root, "workflows/01-api-gateway.built.json"),
  JSON.stringify(gateway, null, 2)
);
console.log("Built: n8n/workflows/01-api-gateway.built.json");
