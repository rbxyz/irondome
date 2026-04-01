export const PERMISSIONS_TEMPLATE = `import {
  actions,
  createPermissions,
  hasRole,
  type Policy,
  Roles,
} from "@irondome/core";

const pagePolicy: Policy = (subject, action, resource) => {
  if (resource.type !== "page" || action !== actions.page.visit) return null;

  if (resource.id.startsWith("/admin")) {
    return hasRole(subject, Roles.admin)
      ? { allowed: true, reason: "admin" }
      : { allowed: false, reason: "apenas admin" };
  }
  if (resource.id.startsWith("/dashboard")) {
    return hasRole(subject, Roles.admin, Roles.member)
      ? { allowed: true, reason: "equipa" }
      : { allowed: false, reason: "apenas member ou admin" };
  }
  if (resource.id.startsWith("/profile")) {
    return { allowed: true, reason: "autenticado" };
  }

  return null;
};

export const { can, authorize, evaluate } = createPermissions({
  policies: [pagePolicy],
  defaultDeny: true,
  // audit: createConsoleAuditHook(), // activa em dev
});
`;

export const MIDDLEWARE_OWN_TEMPLATE = `import { actions, pageResource } from "@irondome/core";
import { verifyToken } from "@irondome/auth/jwt";
import { createRoutePermissionMiddleware } from "@irondome/next";
import { can } from "./lib/irondome/permissions";
import type { Subject } from "@irondome/core";

const COOKIE = "irondome_session";
const JWT_SECRET = process.env.JWT_SECRET ?? "";

async function getSubjectEdge(req: Request): Promise<Subject | null> {
  const cookie = req.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(new RegExp(\`(?:^|;\\\\s*)\${COOKIE}=([^;]+)\`));
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
  ],
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\\\..*).*)"],
};
`;

export const OWN_AUTH_TEMPLATE = `import { createOwnAuth } from "@irondome/auth";
// import { db } from "@/server/db"; // ← substitui pela tua query Drizzle/Prisma

export const ownAuth = createOwnAuth({
  jwtSecret: process.env.JWT_SECRET!,
  cookieName: "irondome_session",
  expiresIn: "7d",
  getUserByEmail: async (email) => {
    // Substitui por: return db.query.users.findFirst({ where: eq(users.email, email) });
    throw new Error("Implementa getUserByEmail com o teu ORM");
  },
});
`;

export const SERVER_SESSION_TEMPLATE = `import { cookies } from "next/headers";
import { ownAuth } from "./own-auth";
import type { Subject } from "@irondome/core";

export async function getServerSubject(): Promise<Subject | null> {
  const jar = await cookies();
  const token = jar.get(ownAuth.cookieName)?.value;
  return ownAuth.getSubjectFromToken(token);
}
`;

export const SIGNIN_ROUTE_TEMPLATE = `import { ownAuth } from "@/lib/irondome/own-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, password } = await req.json() as { email: string; password: string };
  const result = await ownAuth.signIn(email, password);

  if (!result.ok) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ownAuth.cookieName, result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
`;

export const SIGNOUT_ROUTE_TEMPLATE = `import { ownAuth } from "@/lib/irondome/own-auth";
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ownAuth.cookieName);
  return res;
}
`;

export const DRIZZLE_SCHEMA_COMMENT = `// Copia o schema do Irondome para o teu projecto:
// node -e "require('@irondome/auth/schema/pg')"
// Ou adiciona manualmente:
//
// export const users = pgTable('irondome_users', {
//   id: text('id').primaryKey(),
//   email: text('email').notNull().unique(),
//   passwordHash: text('password_hash').notNull(),
//   roles: text('roles').array().notNull().default(['user']),
//   orgId: text('org_id').notNull().default('default'),
//   createdAt: timestamp('created_at').defaultNow(),
// });
`;

export const ENV_EXAMPLE = `# Irondome
JWT_SECRET=replace-with-a-strong-secret-min-32-chars
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
`;
