# Guia dos quatro pilares — Irondome

Este documento explica **o quê**, **como** e **porquê** de cada pilar do Irondome: **PBAC**, **ReBAC**, **Auth** e **Audit**. O objetivo é que qualquer desenvolvedor consiga implementar e usar a ferramenta de forma correta, com decisões conscientes de arquitetura e segurança.

---

## Índice

1. [Visão geral: como os pilares se encaixam](#1-visão-geral-como-os-pilares-se-encaixam)
2. [Pilar 1 — PBAC (Policy-Based Access Control)](#2-pilar-1--pbac-policy-based-access-control)
3. [Pilar 2 — ReBAC (Relation-Based Access Control)](#3-pilar-2--rebac-relation-based-access-control)
4. [Pilar 3 — Auth (autenticação e identidade)](#4-pilar-3--auth-autenticação-e-identidade)
5. [Pilar 4 — Audit (auditoria de decisões)](#5-pilar-4--audit-auditoria-de-decisões)
6. [Fluxos recomendados por cenário](#6-fluxos-recomendados-por-cenário)
7. [Anti-padrões e armadilhas comuns](#7-anti-padrões-e-armadilhas-comuns)

---

## 1. Visão geral: como os pilares se encaixam

| Pilar | Pergunta que responde | Onde vive no Irondome |
|-------|------------------------|------------------------|
| **Auth** | *Quem é esta pessoa ou serviço?* | `@irondome/auth` (credenciais, JWT, adapters) |
| **PBAC** | *Esta identidade pode fazer esta ação neste recurso?* | `@irondome/core` (`PolicyEngine`, `createPermissions`) |
| **ReBAC** | *Existe uma cadeia de relações que justifica o acesso?* | `@irondome/core` (`MemoryRelationStore`, `checkRelation`) |
| **Audit** | *O que foi decidido, quando e com que resultado?* | `@irondome/core` (`AuditHook`, `createConsoleAuditHook`) |

**Ordem mental do pedido HTTP:**

1. **Auth** produz um **`Subject`** (id, roles, orgId, attributes) — ou falha / não existe sessão.
2. **PBAC** (e/ou **ReBAC** dentro das policies) avalia `pode(subject, action, resource, context)`.
3. **Audit** regista o resultado da avaliação (e opcionalmente metadados de contexto).

**Regra de ouro:** *Autenticação não é autorização.* O Irondome separa **identidade** (Auth) de **autorização** (PBAC/ReBAC). Sem isso, misturas de “está logado” com “pode fazer X” geram buracos de segurança.

---

## 2. Pilar 1 — PBAC (Policy-Based Access Control)

### 2.1 O que é PBAC

**PBAC** é um modelo em que a decisão de acesso é feita por **políticas declarativas** (funções ou regras) que recebem **quem** (`Subject`), **o quê** (`Action`), **sobre o quê** (`Resource`) e opcionalmente **contexto** (`Context`).

No Irondome, uma política é uma função pura:

```ts
// Conceito (tipos)
type Policy = (
  subject: Subject,
  action: Action,
  resource: Resource,
  context: Context,
) => PolicyResult | null;
```

- **`null`** — “esta política não aplica-se a este pedido”; o motor passa à **próxima** política.
- **`PolicyResult`** — decisão final **para esta política**; a **primeira** política que devolve **não-`null`** **ganha** (primeiro match).

**Porquê PBAC em vez de JSON “fixo” por utilizador?**

- Escala com **muitos recursos** e **regras compostas** (org, dono, papel, horário).
- Permite **contexto** (IP, ambiente, feature flags).
- Mantém **razões** (`reason`) para auditoria e debugging.
- Evita listas gigantes de permissões por utilizador que ficam impossíveis de manter.

### 2.2 Modelo de dados do PBAC no Irondome

#### Subject (`Subject`)

Representa o **ator** já autenticado (ou um serviço interno).

| Campo | Uso |
|-------|-----|
| `id` | Identificador estável do utilizador (UUID, etc.). |
| `roles` | Lista de papéis (ex.: `admin`, `member`). |
| `orgId` | Tenant / organização; isola dados em políticas multi-tenant. |
| `attributes` | Metadados extras (departamento, plano, flags). |

**O que fazer:** manter `roles` **normalizados** (strings estáveis). Evitar roles dinâmicos sem convenção.

**Porquê:** políticas e auditoria dependem de comparações previsíveis.

#### Resource (`Resource`)

O **alvo** da ação.

| Campo | Uso |
|-------|-----|
| `type` | Domínio: `post`, `page`, `invoice`, `repo`, etc. |
| `id` | Identificador do recurso (pode ser path de página: `/admin`). |
| `ownerId` / `orgId` | Atributos de isolamento e ownership. |
| `attributes` | Dados extras para políticas sem poluir o modelo. |

**Helpers no pacote:** `pageResource(pathname)`, `namedResource(type, id, extra?)`.

**O que fazer:** para **rotas de página**, usar `type: "page"` e `id` = pathname normalizado; para **REST**, `type` + `id` estáveis.

### 2.3 Action e Context

- **`Action`** é uma `string` (convém usar convenções: `page:visit`, `resource:delete`, …). O catálogo `actions` em `@irondome/core` sugere nomes.
- **`Context`** transporta dados **da requisição** (IP, ambiente, timestamp). Útil para políticas condicionais (só produção, só VPN, etc.).

### 2.4 Motor: `PolicyEngine` e `createPermissions`

**`PolicyEngine`**

- Regista uma lista ordenada de `Policy`.
- `evaluate` → devolve `PolicyResult` ou, se nenhuma política aplicar, **negação por omissão** (`default deny`).
- `authorize` → igual a `evaluate`, mas **lança** `UnauthorizedError` se negado.

**`createPermissions({ policies, audit? })`**

- Devolve `{ evaluate, can, authorize }` ( `can` é alias de `evaluate`).
- Opcionalmente liga **Audit** (ver [Pilar 4](#5-pilar-4--audit-auditoria-de-decisões)).

**Porquê “primeira política não-null ganha”?**

- Ordem explícita = comportamento previsível.
- Políticas **mais específicas** devem aparecer **antes** das genéricas.

**O que fazer:** documentar a **ordem** das policies no teu `permissions.ts` (comentário no topo do ficheiro).

### 2.5 Como escrever boas políticas

1. **Cedo retorno `null`** se `resource.type` ou `action` não forem teus — evita negar por engano quando outra policy devia tratar o caso.
2. **Sempre** devolver `reason` legível (para logs, UI de erro, suporte).
3. **Não** fazer I/O pesado dentro da policy (ideal: pura). Se precisares de dados extra, obtém **antes** e passa em `resource.attributes` ou `context`.
4. **ReBAC** pode ser chamado **dentro** de uma policy quando a regra for “membro do grupo que é dono do repo” (ver [Pilar 3](#3-pilar-2--rebac-relation-based-access-control)).

### 2.5.1 Painéis e posição (cargo hierárquico)

Para **áreas de backoffice** em que o acesso depende de **cargo** (não só de `roles` globais), o `@irondome/core` expõe:

- **`subject.attributes.position`** — string (ex.: `manager`, `staff`). Define no login / JWT.
- **`PanelPosition`** e **`POSITION_RANK`** — ordem numérica para comparar privilégio.
- **`getSubjectPosition`**, **`hasMinimumPosition`** — “este utilizador tem pelo menos cargo X?”.
- **`panelResource(pathname)`** — `Resource` com `type: "panel"` para políticas dedicadas.
- **`actions.panel.visit` / `actions.panel.manage`** — ações sugeridas para rotas de painel.

Exemplo de policy:

```ts
import { actions, hasMinimumPosition, type Policy, PanelPosition } from "@irondome/core";

const panelPolicy: Policy = (subject, action, resource) => {
  if (resource.type !== "panel" || action !== actions.panel.visit) return null;
  if (resource.id.startsWith("/painel/financeiro")) {
    return hasMinimumPosition(subject, PanelPosition.manager)
      ? { allowed: true, reason: "cargo suficiente" }
      : { allowed: false, reason: "requer manager ou superior" };
  }
  return null;
};
```

### 2.6 Integração no Next.js (`@irondome/next`)

| Ferramenta | Quando usar |
|------------|-------------|
| `createRoutePermissionMiddleware` | Proteger **rotas** no Edge (middleware) com as mesmas `can()` que no servidor. |
| `runPermissionGuard` | Handlers `Route Handler` / API: avalia `can` com `getSubject` + `resolveResource`. |
| `usePermission` | Componentes cliente: mostrar/ocultar UI com base em `can` (não substitui verificação no servidor). |
| `createIrondomeContext` / `irondomePermission` | **tRPC**: contexto com `can`/`authorize` por procedure. |
| `withPermission` | **Server Actions** com verificação antes de executar a lógica. |

**Porquê:** uma única fonte de verdade (`can`) em middleware, API, tRPC e UI reduz divergências.

### 2.7 Sub-tópicos: desenvolvimento da ferramenta (PBAC)

| Tópico | O que fazer | Porquê |
|--------|-------------|--------|
| Novos tipos de recurso | Definir `type` + contrato de `id` e documentar | Evita políticas ambíguas |
| Novas ações | Adicionar ao catálogo `actions` ou convenção interna | Consistência entre equipas |
| Testes | Testes unitários em `Policy` com casos allow/deny/null | Regressões em refactor são comuns |
| Performance | Manter policies O(1) ou O(n pequeno); cache fora do motor se necessário | Middleware e APIs em alta escala |
| Multi-tenant | Sempre filtrar por `orgId` em `Subject` e `Resource` | Vazamento de dados entre tenants |

---

## 3. Pilar 2 — ReBAC (Relation-Based Access Control)

### 3.1 O que é ReBAC

**ReBAC** modela permissões como **relações** entre entidades, frequentemente num **grafo**:

- `(user:alice) --member--> (team:eng)`
- `(team:eng) --owner--> (repo:api)`

A pergunta típica: *“Alice pode `owner` em `repo:api`?”* pode exigir **transitividade** (membro do time que é dono do recurso).

**Referência industrial:** Google **Zanzibar** (e produtos como SpiceDB, OpenFGA). O Irondome oferece um **núcleo leve** (`RelationStore` + `checkRelation`), não um servidor de políticas completo.

### 3.2 Tuplas (`RelationTuple`)

```ts
type RelationTuple = {
  subject: string;  // ex.: "user:alice"
  relation: string; // ex.: "member", "owner"
  object: string;   // ex.: "team:eng", "repo:api"
};
```

**Convenção de nomeação:** `tipo:id` (`user:alice`, `repo:api`). **Consistência** é obrigatória.

### 3.3 `RelationStore` e `MemoryRelationStore`

- **`RelationStore`** — interface com `find(partial)` para consultas.
- **`MemoryRelationStore`** — implementação em memória para **testes** e **demos**.

**O que fazer em produção:** implementar `RelationStore` com **persistência** (Postgres + índices em `(subject, relation, object)`), ou integrar um serviço ReBAC externo.

**Porquê:** o grafo cresce rapidamente; precisas de queries eficientes e modelo de dados claro.

### 3.4 `checkRelation`

```ts
await checkRelation(
  store,
  "user:alice",
  "owner",
  "repo:api",
  { via: ["member"], maxDepth?: number },
);
```

- **`via`** — lista de relações de **salto** permitidas na BFS (ex.: expandir `member` para encontrar caminhos até `owner`).
- **`maxDepth`** — limita profundidade (evita ciclos e custo excessivo).

**O que fazer:** calibrar `via` e `maxDepth` ao teu modelo de negócio; documentar o **significado** de cada `relation`.

### 3.5 PBAC vs ReBAC: quando usar cada um

| Situação | Preferir |
|----------|----------|
| Papéis globais (`admin`, `viewer`) | PBAC |
| Dono do recurso (ownership) | PBAC (campo `ownerId`) ou ReBAC se o modelo for relacional |
| Membros de equipas, grupos aninhados, herança | ReBAC |
| Políticas de negócio com condições (horário, ambiente) | PBAC em cima; ReBAC pode ser **uma** das condições |

**Padrão combinado:** uma `Policy` chama `checkRelation` quando `resource.type` for `repo` e a ação for `push`.

### 3.6 Sub-tópicos: desenvolvimento da ferramenta (ReBAC)

| Tópico | O que fazer | Porquê |
|--------|-------------|--------|
| Migrações | Tabela de tuplas com índices compostos | Performance de `find` |
| Ciclos | `maxDepth` + testes de grafos com ciclos | Evitar loops infinitos |
| Consistência | Transações ao adicionar/remover múltiplas tuplas | Estados inconsistentes no grafo |
| Sincronização | Se o domínio tiver outra fonte de verdade, definir sync ou eventos | Evita drift entre RBAC e sistema real |

---

## 4. Pilar 3 — Auth (autenticação e identidade)

### 4.1 O que é Auth (neste projeto)

**Auth** responde: *quem é o utilizador?* e entrega um **`Subject`** que o **PBAC** consome.

**Não confundir:**

- **Autenticação** — prova de identidade (senha, OAuth, passkey).
- **Autorização** — PBAC/ReBAC depois de saber o `Subject`.

### 4.2 Auth próprio (`createOwnAuth`)

Fluxo:

1. `getUserByEmail(email)` — obtéis o registo na base (com `passwordHash`).
2. `verifyPassword(plain, hash)` — bcrypt com comparação segura.
3. `signToken(...)` — JWT com claims mínimos (`sub`, `roles`, `orgId`, `attributes`).
4. Cookie **httpOnly** com o token (ou header `Authorization` em APIs puras).

**API exposta:**

- `signIn(email, password)` → `{ ok, token?, subject? }` ou erro de credenciais.
- `getSubjectFromToken(token)` → `Subject | null`.
- `cookieName` — nome do cookie predefinido.

**Porquê bcrypt com hash dummy quando o user não existe?** Reduz **timing attacks** que enumeram emails.

### 4.3 JWT no Edge (`@irondome/auth/jwt`)

O **middleware** do Next.js corre no **Edge** — não uses bcrypt aí. Importa apenas:

```ts
import { verifyToken } from "@irondome/auth/jwt";
```

Constrói o `Subject` a partir do payload verificado.

**O que fazer:** `JWT_SECRET` forte e único por ambiente; rotação de segredos documentada.

### 4.4 NextAuth (`nextAuthToSubject`)

- Mapeia a sessão do NextAuth para `Subject`.
- Permite `getRoles` customizado e `defaultOrgId`.

**Porquê:** não duplicar o modelo de utilizador; o Irondome só precisa de `roles` e `orgId` coerentes com as policies.

### 4.5 Clerk (`clerkToSubject`)

- Usa `userId`, `orgId` e metadata para roles.

**Porquê:** Clerk já gere identidade; tu alinhas **metadata** com o que as policies esperam.

### 4.6 Schema Drizzle (`@irondome/auth/schema/pg`)

Tabela `irondome_users` com `password_hash`, `roles[]`, `org_id`. Serve como **ponto de partida** para migrações.

### 4.7 Sub-tópicos: desenvolvimento da ferramenta (Auth)

| Tópico | O que fazer | Porquê |
|--------|-------------|--------|
| Segredos | `JWT_SECRET` em env, nunca em código | Compromisso do token = compromisso total |
| Cookies | `httpOnly`, `secure` em prod, `sameSite` adequado | Mitiga XSS e CSRF |
| CSRF | SameSite + tokens em formulários se necessário | Camada extra em mutações |
| Refresh / sessão longa | Fora do núcleo atual; planejar refresh tokens | UX vs segurança |
| Sincronização roles | Roles na BD vs no JWT — decidir fonte de verdade | Evita divergência |

---

## 5. Pilar 4 — Audit (auditoria de decisões)

### 5.1 O que é Audit no Irondome

**Audit** regista **cada decisão** de `evaluate`/`can` quando configurás um **`AuditHook`** em `createPermissions`.

**Evento (`AuditEvent`):**

- `subject`, `action`, `resource`, `result` (`allowed`, `reason`), `context`, `timestamp`.

### 5.2 `createConsoleAuditHook`

Implementação de referência que imprime linhas no console.

- `onlyDenied: true` — só negações (menos ruído em dev).

**Porquê:** debugging rápido sem infraestrutura.

### 5.3 Produção

**O que fazer:**

- Persistir em tabela (`audit_logs`) com índices por `subject.id`, `timestamp`, `resource.type`.
- Ou enviar para SIEM (Datadog, CloudWatch, etc.).
- **Cuidado com PII** — não logar passwords nem tokens.

**Async:** o hook pode ser `async`; erros são capturados em `console.error` para não derrubar o pedido.

### 5.4 Sub-tópicos: desenvolvimento da ferramenta (Audit)

| Tópico | O que fazer | Porquê |
|--------|-------------|--------|
| Retenção | Política de retenção e arquivamento | Compliance (GDPR, SOC2) |
| Volume | Amostragem ou só `deny` em alta escala | Performance e custo |
| Correlação | `requestId` em `context` | Rastrear um pedido end-to-end |
| Integridade | Append-only ou hash chains | Detecção de adulteração |

---

## 6. Fluxos recomendados por cenário

### 6.1 “Só páginas e roles simples”

1. Auth → `Subject` com `roles`.
2. PBAC com `pageResource` + `actions.page.visit`.
3. Middleware com `createRoutePermissionMiddleware`.

### 6.2 “API + tRPC + Server Actions”

1. Mesmo `can` exportado de `permissions.ts`.
2. tRPC: `createIrondomeContext` + `irondomePermission`.
3. Server Actions: `withPermission`.

### 6.3 “Equipas e repositórios”

1. ReBAC: guardar tuplas; `checkRelation` dentro de policies para `resource.type === "repo"`.
2. PBAC para ações finas (`resource:push`, `resource:delete`).

### 6.4 “Compliance e investigação”

1. `audit` em `createPermissions` + armazenamento persistente.
2. `context` com `requestId`, `ip` (quando disponível).

---

## 7. Anti-padrões e armadilhas comuns

| Armadilha | Porquê é mal |
|-----------|--------------|
| Confiar só no cliente (`usePermission`) | UI pode ser manipulada; **sempre** validar no servidor |
| Policies com efeitos colaterais (DB writes) | Dificulta testes e pode causar efeitos duplicados |
| Roles sem convenção | Políticas quebram silenciosamente |
| JWT sem expiração curta em apps sensíveis | Janela de abuso se token vazar |
| ReBAC sem `maxDepth` em grafos desconhecidos | Risco de custo computacional |
| Audit com dados sensíveis em claro | Violação de privacidade e compliance |

---

## Referência rápida de pacotes

| Pacote | Responsabilidade principal |
|--------|----------------------------|
| `@irondome/core` | PBAC, ReBAC, Audit hooks, catálogo de helpers |
| `@irondome/auth` | Auth próprio, JWT edge, adapters, schema Drizzle |
| `@irondome/next` | Middleware, guards, hooks, tRPC, Server Actions |
| `irondome` (CLI) | Scaffolding e templates |

---

*Última atualização: alinhado ao código do monorepo Irondome (PBAC/ReBAC/Auth/Audit).*
