# Irondome

> PBAC + ReBAC + auth próprio para Next.js — plug-and-play, sem magia negra.

```bash
npx irondome@latest init
```

---
> Quem decide o que cada pessoa pode fazer na sua aplicação — o código ou a política?

## O que é?

Irondome é um sistema de permissões moderno para projetos Next.js. Usa **Policy-Based Access Control (PBAC)** para proteger rotas, páginas, Server Actions e API routes — com o mesmo motor e as mesmas policies em toda a stack.

Inclui auth próprio (email + senha + JWT), adapters para NextAuth e Clerk, **ReBAC** para relações entre entidades (estilo Google Zanzibar) e um **Audit log** com hook configurável.

### Documentação detalhada (PBAC, ReBAC, Auth, Audit)

- **[Guia dos quatro pilares](./docs/guia-dos-pilares.md)** — o quê, como e porquê de cada pilar, sub-tópicos para desenvolvimento e uso correto, fluxos recomendados e anti-padrões.

---

## Pacotes

| Pacote | Descrição |
|--------|-----------|
| [`@irondome/core`](./packages/core) | Motor PBAC, ReBAC, Audit — sem dependência de Next |
| [`@irondome/auth`](./packages/auth) | bcrypt + JWT, adapters NextAuth/Clerk, schema Drizzle |
| [`@irondome/next`](./packages/next) | Middleware de rotas, `usePermission`, tRPC helpers, Server Action wrapper |
| [`irondome`](./apps/cli) | CLI: `irondome init`, `irondome add` |

---

## Início rápido

### 1. Inicializar num projeto Next.js

```bash
npx irondome@latest init
# ou em projeto existente
npx irondome@latest init --cwd ./meu-app
```

O CLI pergunta o provider de auth e as features pretendidas e gera os ficheiros necessários.

### 2. Instalar manualmente

```bash
pnpm add @irondome/core @irondome/auth @irondome/next
```

---

## PBAC — Policies

```ts
// lib/irondome/permissions.ts
import { actions, createPermissions, hasRole, Roles, type Policy } from "@irondome/core";

const pagePolicy: Policy = (subject, action, resource) => {
  if (resource.type !== "page" || action !== actions.page.visit) return null;
  if (resource.id.startsWith("/admin")) {
    return hasRole(subject, Roles.admin)
      ? { allowed: true, reason: "admin" }
      : { allowed: false, reason: "apenas admin" };
  }
  return null;
};

export const { can, authorize } = createPermissions({ policies: [pagePolicy] });
```

### Middleware (proteção de rotas)

```ts
// middleware.ts
import { createRoutePermissionMiddleware } from "@irondome/next";
import { actions, pageResource } from "@irondome/core";
import { verifyToken } from "@irondome/auth/jwt";
import { can } from "./lib/irondome/permissions";

export default createRoutePermissionMiddleware({
  getSubject: async (req) => {
    const token = /* extrair cookie */;
    const payload = await verifyToken(token, process.env.JWT_SECRET!);
    return payload ? { id: payload.sub, roles: payload.roles, orgId: payload.orgId } : null;
  },
  can,
  publicPaths: ["/", "/api/auth/*"],
  rules: [
    { match: (p) => p.startsWith("/admin"), action: actions.page.visit, resource: (p) => pageResource(p) },
  ],
});
```

### Hook React (client)

```tsx
import { usePermission } from "@irondome/next";
import { namedResource } from "@irondome/core";

const { allowed } = usePermission(can, session.user, "resource:delete", namedResource("post", post.id));
return allowed ? <DeleteButton /> : null;
```

---

## Auth próprio

```ts
// lib/irondome/own-auth.ts
import { createOwnAuth } from "@irondome/auth";
import { db } from "@/server/db";
import { irondomeUsers } from "@irondome/auth/schema/pg";
import { eq } from "drizzle-orm";

export const ownAuth = createOwnAuth({
  jwtSecret: process.env.JWT_SECRET!,
  getUserByEmail: (email) =>
    db.query.irondomeUsers.findFirst({ where: eq(irondomeUsers.email, email) }),
});
```

```ts
// app/api/auth/signin/route.ts
import { ownAuth } from "@/lib/irondome/own-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const result = await ownAuth.signIn(email, password);
  if (!result.ok) return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ownAuth.cookieName, result.token, { httpOnly: true, sameSite: "lax" });
  return res;
}
```

### Adapters (NextAuth / Clerk)

```ts
import { nextAuthToSubject } from "@irondome/auth";
const subject = nextAuthToSubject(session, { getRoles: (s) => s.user?.roles ?? ["user"] });

import { clerkToSubject } from "@irondome/auth";
const subject = clerkToSubject(await auth());
```

---

## ReBAC

```ts
import { MemoryRelationStore, checkRelation } from "@irondome/core";

const store = new MemoryRelationStore();
store.add(
  { subject: "user:alice", relation: "member", object: "team:eng" },
  { subject: "team:eng",   relation: "owner",  object: "repo:api" },
);

// alice pode aceder a repo:api via cadeia member → owner?
await checkRelation(store, "user:alice", "owner", "repo:api", { via: ["member"] });
// → true
```

Em produção, implementa `RelationStore` com o teu ORM (Drizzle, Prisma…).

---

## Audit

```ts
import { createPermissions, createConsoleAuditHook } from "@irondome/core";

const { can } = createPermissions({
  policies,
  audit: createConsoleAuditHook({ onlyDenied: false }),
});
// [irondome] ✗ user-123(member) resource:delete post:p1 — apenas admin
```

---

## tRPC

```ts
// server/api/trpc.ts
import { createIrondomeContext } from "@irondome/next";
import { can } from "@/lib/irondome/permissions";

export const createTRPCContext = async () => {
  const subject = await getServerSubject();
  return { ...createIrondomeContext(can, subject) };
};

// procedures
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.subject) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next();
});
```

```ts
import { irondomePermission } from "@irondome/next";
import { namedResource } from "@irondome/core";

const canDelete = irondomePermission(can, "resource:delete", (input: { id: string }) =>
  namedResource("post", input.id),
);
export const deletePost = protectedProcedure.use(canDelete).mutation(...);
```

---

## CLI

```bash
npx irondome@latest init          # setup inicial
npx irondome@latest add auth      # só os ficheiros de auth
npx irondome@latest add rebac     # stub ReBAC
npx irondome@latest add audit     # stub Audit
```

---

## Schema Drizzle (PostgreSQL)

```ts
import { irondomeUsers } from "@irondome/auth/schema/pg";
// Adiciona à tua migration e faz drizzle-kit push
```

---

## Variáveis de ambiente

```env
JWT_SECRET=mínimo-32-chars-aleatórios
DATABASE_URL=postgresql://user:pass@host/db
```

---

## Licença

MIT © rbxyz
