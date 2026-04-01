# Irondome — mapa do scaffolding

Este documento descreve **o que existe no monorepo**, **o que o CLI gera no projeto consumidor** e **como os pacotes se encaixam**. Serve como contrato de implementação do `irondome` CLI e dos pacotes `@irondome/*`.

---

## 1. Monorepo (fonte da verdade)

```
irondome/                          # repositório da lib + CLI
├── apps/
│   └── cli/                       # pacote npm `irondome` (bin)
├── packages/
│   ├── core/                      # @irondome/core — PBAC engine, tipos, ReBAC (roadmap)
│   ├── next/                      # @irondome/next — middleware, hooks, helpers App Router
│   └── auth/                      # @irondome/auth — sessão, Subject, adapters (own | nextauth | clerk)
├── templates/                     # arquivos copiados pelo CLI (ejs/handlebars ou strings)
│   ├── base/                      # sempre
│   ├── auth-own/
│   ├── auth-nextauth/
│   ├── auth-clerk/
│   ├── rebac/                     # opcional
│   └── audit/                     # opcional
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

| Pasta | Responsabilidade |
|-------|------------------|
| `packages/core` | `PolicyEngine`, tipos `Subject` / `Resource` / `Action` / `Context`, `createPermissions`, futuro store ReBAC |
| `packages/next` | `withPermission`, integração `middleware.ts`, hooks client (`usePermission`), exemplos tRPC procedure |
| `packages/auth` | Normalizar **sempre** para `Subject` + cookie/JWT; adapters por provider |
| `apps/cli` | `irondome init`, prompts (Clack), merge de templates, `package.json` patches |

---

## 2. CLI — comando → efeitos

| Comando | Entrada (prompts) | Saída no CWD (projeto do usuário) |
|---------|-------------------|-----------------------------------|
| `npx irondome@latest init` | Auth: `own` \| `nextauth` \| `clerk`; features: PBAC, ReBAC (beta), Audit | Pastas + ficheiros listados na §3 |
| `npx irondome@latest add auth` | Sub-comando se já existe Irondome | Só templates `auth-*` + deps |
| `npx irondome@latest add rebac` | — | Schema Drizzle relações + stub resolver |

**Regras do CLI:**

1. **Nunca** sobrescrever ficheiros sem `--force` ou backup `.irondome.bak`.
2. **Sempre** declarar dependências peer: `next`, `react`, `@irondome/core`, etc.
3. **Detectar** stack: se existir `trpc` + `drizzle`, gerar procedures/middleware alinhados; senão, apenas rotas API + server actions mínimas.

---

## 3. Matriz de templates (o que é gerado)

Linhas = **modo de auth**; colunas = **ficheiros-chave** (nem todas as combinações existem).

### 3.1 Auth próprio (`own`)

| Destino no app | Conteúdo |
|----------------|----------|
| `lib/irondome/permissions.ts` | `createPermissions` + registo de policies |
| `lib/irondome/policies/*.ts` | Exemplo `posts.policy.ts` |
| `lib/irondome/subject.ts` | Mapear `User` Drizzle → `Subject` |
| `server/auth/login.action.ts` | Server Action: bcrypt + `jose` JWT + cookie httpOnly |
| `server/auth/session.ts` | Ler cookie, validar JWT, expor `getSession()` |
| `server/db/schema/auth.ts` | `users`, opcional `sessions` |
| `.env.example` | `JWT_SECRET`, `DATABASE_URL` |

### 3.2 NextAuth

| Destino | Conteúdo |
|---------|----------|
| `auth.ts` / `server/auth/config.ts` | Adapter Drizzle + callbacks populando `roles` no token/session |
| `lib/irondome/subject.ts` | `session.user` → `Subject` |
| deps | `next-auth`, adapter oficial ou community Drizzle |

### 3.3 Clerk

| Destino | Conteúdo |
|---------|----------|
| `middleware.ts` | `clerkMiddleware` + ordem com Irondome se necessário |
| `lib/irondome/subject.ts` | `auth()` Clerk → `Subject` (orgId, roles via metadata) |
| deps | `@clerk/nextjs` |

### 3.4 Comum a todos (PBAC)

| Destino | Conteúdo |
|---------|----------|
| `lib/irondome/types.ts` | Re-export ou extensão dos tipos do core |
| `app/api/_health/irondome/route.ts` | Opcional: versão dos pacotes (debug) |

### 3.5 Opcional ReBAC (roadmap)

| Destino | Conteúdo |
|---------|----------|
| `server/db/schema/rebac.ts` | Tabela tuplas `(subject, relation, object)` |
| `lib/irondome/rebac.ts` | `checkRelation` ou chamada ao core |

### 3.6 Opcional Audit

| Destino | Conteúdo |
|---------|----------|
| `server/db/schema/audit.ts` | Log de `deny`/`allow` (opcional) |
| `lib/irondome/audit.ts` | Hook pós-`evaluate` |

---

## 4. Fluxo de dados (visão runtime)

```mermaid
flowchart LR
  subgraph request [Pedido Next.js]
    MW[middleware / tRPC ctx]
  end
  subgraph irondome [Pacotes Irondome]
    AUTH[@irondome/auth]
    CORE[@irondome/core]
    NEXT[@irondome/next]
  end
  MW --> AUTH
  AUTH -->|Subject| CORE
  CORE -->|PolicyResult| NEXT
  NEXT -->|403 ou next| request
```

1. **Auth** resolve identidade → `Subject` (id, roles, orgId, attributes).
2. **Core** executa cadeia de policies (PBAC); ReBAC consulta tuplas/grafo quando ativo.
3. **Next** aplica o resultado em route handlers, Server Actions e componentes (hook).

---

## 5. Dependências entre pacotes (publicação)

```
@irondome/core          (sem dependência de Next)
    ↑
@irondome/auth         (opcional: jose, bcrypt — peer)
    ↑
@irondome/next         (peer: next, react, core, auth)
```

O **CLI** depende de todos só em **dev** para testes e lockfile de templates; o **utilizador** instala apenas o que escolheu no `init`.

---

## 6. Alinhamento com T3 (tRPC + Drizzle)

| Camada T3 | Onde entra Irondome |
|-----------|---------------------|
| `server/api/trpc.ts` | Context inclui `session` já como `Subject` ou raw user + helper |
| Procedures | `protectedProcedure` + `.use(irondomeMiddleware({ action, resource }))` |
| `server/db/schema` | Tabelas auth + ReBAC geradas ou merged pelo CLI |
| Client | `usePermission` de `@irondome/next` com dados vindos de `user` na sessão |

---

## 7. Checklist de implementação (ordem sugerida)

1. `packages/core` — engine + testes unitários.
2. `packages/auth` — interface `SessionAdapter` + implementação `own`.
3. `packages/next` — helpers mínimos (sem acoplar a um UI kit).
4. `apps/cli` — `init` só com `own` + PBAC; depois nextauth/clerk.
5. Templates versionados em `templates/` com testes de snapshot do diff gerado.

---

## 8. Estado atual deste repositório

Implementado: **`packages/core`** (PBAC + testes Vitest), **`packages/auth`** (Subject + `SessionAdapter`), **`packages/next`** (`runPermissionGuard`, respostas JSON, `usePermission`), **`apps/cli`** (`irondome init` com Clack + `lib/irondome/` de exemplo). A pasta **`templates/`** para cópia massiva de ficheiros ainda é roadmap — o CLI gera hoje `irondome.config.json` e `permissions.example.ts` quando PBAC está selecionado.
