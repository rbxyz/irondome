import { runPermissionGuard, unauthorizedJson } from "@irondome/next";
import { can } from "@/lib/irondome/permissions";
import { ownAuth } from "@/lib/irondome/own-auth";
import { NextResponse, type NextRequest } from "next/server";

/** Exemplo de API protegida por ação (`invoice:delete`) — não é página. */
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(ownAuth.cookieName)?.value;
  const result = await runPermissionGuard(
    {
      evaluate: can,
      getSubject: async () => ownAuth.getSubjectFromToken(token),
      action: "invoice:delete",
      resolveResource: () => ({ type: "demo", id: "invoice:demo" }),
    },
    req,
  );

  if ("reason" in result && result.reason === "unauthenticated") {
    return unauthorizedJson();
  }
  if (!result.allowed) {
    return NextResponse.json({ error: result.reason }, { status: 403 });
  }

  return NextResponse.json({ deleted: true });
}
