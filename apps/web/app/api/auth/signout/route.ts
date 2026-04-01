import { ownAuth } from "@/lib/irondome/own-auth";
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ownAuth.cookieName);
  return res;
}
