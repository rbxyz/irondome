import {
  cancel,
  intro,
  isCancel,
  log,
  multiselect,
  outro,
  select,
  spinner,
} from "@clack/prompts";
import { Command } from "commander";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DRIZZLE_SCHEMA_COMMENT,
  ENV_EXAMPLE,
  MIDDLEWARE_OWN_TEMPLATE,
  OWN_AUTH_TEMPLATE,
  PERMISSIONS_TEMPLATE,
  SERVER_SESSION_TEMPLATE,
  SIGNIN_ROUTE_TEMPLATE,
  SIGNOUT_ROUTE_TEMPLATE,
} from "./templates/base.js";

type AuthChoice = "own" | "nextauth" | "clerk";

type FeatureChoice = "pbac" | "rebac" | "audit";

type InitOptions = {
  auth: AuthChoice;
  features: FeatureChoice[];
  cwd: string;
};

async function safeWrite(filePath: string, content: string, force: boolean) {
  try {
    await readFile(filePath);
    if (!force) {
      log.warn(`Já existe: ${path.relative(process.cwd(), filePath)} (usa --force para sobrescrever)`);
      return;
    }
  } catch {
    // ficheiro não existe — prossegue
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
  log.success(`Criado: ${path.relative(process.cwd(), filePath)}`);
}

async function scaffoldBase(opts: InitOptions, force: boolean) {
  const { cwd, features } = opts;

  const s = spinner();
  s.start("A gerar ficheiros base...");

  const tasks: Array<[string, string]> = [
    [
      path.join(cwd, "lib", "irondome", "irondome.config.json"),
      JSON.stringify({ version: 1, auth: opts.auth, features, generatedAt: new Date().toISOString() }, null, 2) + "\n",
    ],
  ];

  if (features.includes("pbac")) {
    tasks.push([path.join(cwd, "lib", "irondome", "permissions.ts"), PERMISSIONS_TEMPLATE]);
  }

  s.stop("Ficheiros base preparados.");

  for (const [p, content] of tasks) {
    await safeWrite(p, content, force);
  }
}

async function scaffoldAuthOwn(opts: InitOptions, force: boolean) {
  const { cwd } = opts;
  const tasks: Array<[string, string]> = [
    [path.join(cwd, "lib", "irondome", "own-auth.ts"), OWN_AUTH_TEMPLATE],
    [path.join(cwd, "lib", "irondome", "session.ts"), SERVER_SESSION_TEMPLATE],
    [path.join(cwd, "middleware.ts"), MIDDLEWARE_OWN_TEMPLATE],
    [path.join(cwd, "app", "api", "auth", "signin", "route.ts"), SIGNIN_ROUTE_TEMPLATE],
    [path.join(cwd, "app", "api", "auth", "signout", "route.ts"), SIGNOUT_ROUTE_TEMPLATE],
    [path.join(cwd, "server", "db", "schema", "irondome.ts"), DRIZZLE_SCHEMA_COMMENT],
    [path.join(cwd, ".env.example"), ENV_EXAMPLE],
  ];

  for (const [p, content] of tasks) {
    await safeWrite(p, content, force);
  }
}

async function patchPackageJson(cwd: string, auth: AuthChoice, features: FeatureChoice[]) {
  const pkgPath = path.join(cwd, "package.json");
  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(await readFile(pkgPath, "utf8")) as Record<string, unknown>;
  } catch {
    log.warn("package.json não encontrado — pulando patch de dependências.");
    return;
  }

  const deps = (pkg["dependencies"] as Record<string, string> | undefined) ?? {};
  deps["@irondome/core"] = "latest";
  deps["@irondome/next"] = "latest";

  if (auth === "own" || features.includes("pbac")) {
    deps["@irondome/auth"] = "latest";
  }

  pkg["dependencies"] = deps;
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  log.success("package.json atualizado com @irondome/*");
}

async function runInit(cwd: string, force: boolean): Promise<void> {
  intro("irondome — permissões e auth para Next.js");

  const authRaw = await select({
    message: "Provider de autenticação",
    options: [
      { value: "own" as const, label: "Próprio (email + bcrypt + JWT)" },
      { value: "nextauth" as const, label: "NextAuth.js" },
      { value: "clerk" as const, label: "Clerk" },
    ],
    initialValue: "own",
  });

  if (isCancel(authRaw)) { cancel("Cancelado."); process.exit(0); }
  const auth = authRaw as AuthChoice;

  const featuresRaw = await multiselect({
    message: "Funcionalidades a instalar",
    options: [
      { value: "pbac" as const, label: "PBAC — políticas declarativas" },
      { value: "rebac" as const, label: "ReBAC — grafo de relações" },
      { value: "audit" as const, label: "Audit log" },
    ],
    initialValues: ["pbac"],
    required: false,
  });

  if (isCancel(featuresRaw)) { cancel("Cancelado."); process.exit(0); }
  const features = featuresRaw as FeatureChoice[];

  const opts: InitOptions = { auth, features, cwd };

  await scaffoldBase(opts, force);

  if (auth === "own") {
    await scaffoldAuthOwn(opts, force);
  } else if (auth === "nextauth") {
    log.info("NextAuth: instala next-auth e passa a sessão por nextAuthToSubject(@irondome/auth).");
  } else {
    log.info("Clerk: instala @clerk/nextjs e passa auth() por clerkToSubject(@irondome/auth).");
  }

  await patchPackageJson(cwd, auth, features);

  outro("Irondome configurado! Roda `pnpm install` e define JWT_SECRET no .env.");
}

async function runAdd(feature: string, cwd: string, force: boolean) {
  intro(`irondome add ${feature}`);

  if (feature === "auth") {
    const authRaw = await select({
      message: "Provider",
      options: [
        { value: "own" as const, label: "Próprio (bcrypt + JWT)" },
        { value: "nextauth" as const, label: "NextAuth.js" },
        { value: "clerk" as const, label: "Clerk" },
      ],
      initialValue: "own",
    });
    if (isCancel(authRaw)) { cancel("Cancelado."); process.exit(0); }
    if (authRaw === "own") {
      await scaffoldAuthOwn({ auth: "own", features: [], cwd }, force);
    } else {
      log.info(`Para ${String(authRaw)}: usa o adapter correspondente de @irondome/auth.`);
    }
  } else if (feature === "rebac") {
    const content = `import { MemoryRelationStore, checkRelation } from "@irondome/core";

// Em produção, substitui MemoryRelationStore por um adapter que persiste tuplas em DB.
export const relationStore = new MemoryRelationStore();

// Exemplo: alice é membro da equipa de engenharia
// relationStore.add({ subject: "user:alice", relation: "member", object: "team:eng" });
// relationStore.add({ subject: "team:eng",   relation: "owner",  object: "repo:api" });

// Verifica: pode alice aceder ao repo:api via member → owner?
// await checkRelation(relationStore, "user:alice", "owner", "repo:api", { via: ["member"] });
`;
    await safeWrite(path.join(cwd, "lib", "irondome", "rebac.ts"), content, force);
    log.info("ReBAC: adapta o RelationStore para persistência no teu ORM.");
  } else if (feature === "audit") {
    const content = `import { createConsoleAuditHook } from "@irondome/core";

// Usa o hook no createPermissions:
// const { can } = createPermissions({ policies, audit: createConsoleAuditHook() });

// Para produção, persiste o evento numa tabela:
// const dbAuditHook = (event) => db.insert(auditLogs).values({ ...event });
export const auditHook = createConsoleAuditHook({ onlyDenied: false });
`;
    await safeWrite(path.join(cwd, "lib", "irondome", "audit.ts"), content, force);
  } else {
    log.warn(`Feature desconhecida: "${feature}". Usa: auth | rebac | audit`);
  }

  outro("Pronto!");
}

const program = new Command();

program
  .name("irondome")
  .description("Scaffold Irondome em projetos Next.js")
  .version("0.0.4");

program
  .command("init")
  .description("Configura Irondome no projeto atual")
  .option("-c, --cwd <dir>", "diretório do projeto", process.cwd())
  .option("-f, --force", "sobrescrever ficheiros existentes", false)
  .action((opts: { cwd: string; force: boolean }) => {
    void runInit(path.resolve(opts.cwd), opts.force);
  });

program
  .command("add <feature>")
  .description("Adiciona uma funcionalidade: auth | rebac | audit")
  .option("-c, --cwd <dir>", "diretório do projeto", process.cwd())
  .option("-f, --force", "sobrescrever ficheiros existentes", false)
  .action((feature: string, opts: { cwd: string; force: boolean }) => {
    void runAdd(feature, path.resolve(opts.cwd), opts.force);
  });

program.parse();
