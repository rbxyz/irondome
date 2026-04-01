import { ownAuth } from "@/lib/irondome/own-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = (await req.json()) as { email?: string; password?: string };

  if (!body.email || !body.password) {
    return NextResponse.json({ error: "email e password obrigatórios" }, { status: 400 });
  }

  const result = await ownAuth.signIn(body.email, body.password);

  if (!result.ok) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, subject: result.subject });
  res.cookies.set(ownAuth.cookieName, result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
