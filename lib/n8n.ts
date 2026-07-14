import type { ApiError } from "./types";

export async function n8nRequest<T>(
  action: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const url = process.env.N8N_WEBHOOK_URL;
  const apiKey = process.env.N8N_API_KEY;

  if (!url) {
    throw new Error("N8N_WEBHOOK_URL is not configured");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
    },
    body: JSON.stringify({ action, ...params }),
    cache: "no-store",
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error(`n8n returned invalid JSON (status ${response.status})`);
  }

  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as ApiError).error === "string"
        ? (data as ApiError).error
        : `n8n request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}
