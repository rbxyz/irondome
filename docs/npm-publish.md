# Publicar pacotes Irondome no npm

## Problema que evitamos

- **Nunca** publicar a raiz do monorepo (`irondome-monorepo` é `private: true`). Um `npm publish` na raiz gerava um tarball **sem `dist/` importável** e sem `bin` para o CLI.
- Cada pacote publicável traz o seu **`dist/`** via campo `"files": ["dist"]` após `pnpm run build`.

## Pacotes publicáveis

| Nome npm | Pasta | Importação |
|----------|-------|------------|
| `@irondome/core` | `packages/core` | `import { createPermissions } from "@irondome/core"` |
| `@irondome/auth` | `packages/auth` | `import { createOwnAuth } from "@irondome/auth"` |
| `@irondome/next` | `packages/next` | `import { ... } from "@irondome/next"` |
| `irondome` | `apps/cli` | `npx irondome init` (bin) |

## Dependências entre pacotes (registo npm)

- `@irondome/auth` e `@irondome/next` declaram **`@irondome/core`** (e entre si) como **`peerDependencies`** com intervalo semver (`>=0.0.2`), **não** `workspace:*`.
- No monorepo, `devDependencies` com `workspace:*` mantém o desenvolvimento local.
- Quem instala da npm deve ter: `pnpm add @irondome/core @irondome/auth @irondome/next` (versões compatíveis).

## Comando de publicação (manual)

Na raiz do repositório, com build feito e login npm (`npm login`):

```bash
pnpm turbo run build --filter=@irondome/core --filter=@irondome/auth --filter=@irondome/next --filter=irondome

pnpm publish --filter @irondome/core --access public --no-git-checks
pnpm publish --filter @irondome/auth --access public --no-git-checks
pnpm publish --filter @irondome/next --access public --no-git-checks
pnpm publish --filter irondome --access public --no-git-checks
```

(Ordem: **core** → **auth** → **next** → **CLI**, por causa dos peers.)

Ou com **Changesets** (recomendado em CI):

```bash
pnpm changeset version   # após adicionar changesets
pnpm run release         # turbo build + changeset publish
```

## Verificar o tarball antes de publicar

```bash
pnpm pack --filter @irondome/core
tar -tzf irondome-core-*.tgz | head
# Deve listar package.json e dist/index.js, dist/index.d.ts, ...
```

## Consumidor final

```bash
pnpm add @irondome/core
```

```ts
import { createPermissions, hasMinimumPosition, panelResource, actions } from "@irondome/core";
```
