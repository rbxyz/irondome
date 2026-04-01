---
"@irondome/auth": minor
"@irondome/core": minor
"@irondome/next": minor
"irondome": minor
---

Primeira versão pública do Irondome.

- `@irondome/core`: motor PBAC, catálogo de roles/actions, ReBAC (MemoryRelationStore + checkRelation) e Audit hook.
- `@irondome/auth`: auth próprio (bcrypt + jose JWT), adapters NextAuth/Clerk, schema Drizzle (PostgreSQL).
- `@irondome/next`: middleware de rotas, guard para route handlers, `usePermission`, tRPC context/middleware, `withPermission` para Server Actions.
- `irondome` (CLI): `init` e `add` com templates para auth-own, ReBAC e Audit.
