import { actions, pageResource } from "@irondome/core";
import { verifyToken } from "@irondome/auth/jwt";
import { createRoutePermissionMiddleware } from "@irondome/next";
import { can } from "./lib/irondome/permissions";
import type { Subject } from "@irondome/core";

const COOKIE = "irondome_session";
const JWT_SECRET = process.env["JWT_SECRET"] ?? "demo-secret-change-in-production";

async function getSubjectEdge(req: Request): Promise<Subject | null> {
  const cookie = req.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!match?.[1]) return null;
  const payload = await verifyToken(decodeURIComponent(match[1]), JWT_SECRET);
  if (!payload) return null;
  return { id: payload.sub, roles: payload.roles, orgId: payload.orgId };
}

export default createRoutePermissionMiddleware({
  getSubject: getSubjectEdge,
  can,
  publicPaths: ["/", "/api/auth/*"],
  rules: [
    {
      match: (p) => p.startsWith("/admin"),
      action: actions.page.visit,
      resource: (p) => pageResource(p),
    },
    {
      match: (p) => p.startsWith("/dashboard"),
      action: actions.page.visit,
      resource: (p) => pageResource(p),
    },
    {
      match: (p) => p.startsWith("/profile"),
      action: actions.page.visit,
      resource: (p) => pageResource(p),
    },
  ],
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
