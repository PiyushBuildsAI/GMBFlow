import { NextResponse } from "next/server";
import { n8nRequest } from "@/lib/n8n";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    if (!action || typeof action !== "string") {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    const data = await n8nRequest(action, params);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
