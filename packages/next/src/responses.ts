import { NextResponse } from "next/server";

export function forbiddenJson(reason: string): NextResponse {
  return NextResponse.json({ error: reason }, { status: 403 });
}

export function unauthorizedJson(reason = "Unauthorized"): NextResponse {
  return NextResponse.json({ error: reason }, { status: 401 });
}
