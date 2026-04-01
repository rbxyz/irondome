import type { Action, Resource, Subject } from "./types.js";

/** Nomes de papel convencionais — usa em `subject.roles`. */
export const Roles = {
  admin: "admin",
  member: "member",
  viewer: "viewer",
} as const;

export type RoleName = (typeof Roles)[keyof typeof Roles];

/**
 * Ações recomendadas para o motor PBAC.
 * - `page.visit` — aceder a uma rota/página.
 * - `resource.*` — operações em domínio (REST-like).
 */
export const actions = {
  page: {
    visit: "page:visit",
  },
  resource: {
    create: "resource:create",
    read: "resource:read",
    update: "resource:update",
    delete: "resource:delete",
  },
} as const;

/** Recurso do tipo página (pathname normalizado, ex.: `/admin/users`). */
export function pageResource(pathname: string): Resource {
  const id = pathname === "" ? "/" : pathname.startsWith("/") ? pathname : `/${pathname}`;
  return { type: "page", id };
}

/** Recurso genérico nomeado (ex.: `invoice`, `post`). */
export function namedResource(
  type: string,
  id: string,
  extra?: Partial<Omit<Resource, "type" | "id">>,
): Resource {
  return { type, id, ...extra };
}

/** Verifica se o sujeito tem pelo menos um dos papéis. */
export function hasRole(subject: Subject, ...roles: string[]): boolean {
  return roles.some((r) => subject.roles.includes(r));
}

/** Exige todos os papéis (útil para permissões compostas). */
export function hasEveryRole(subject: Subject, ...roles: string[]): boolean {
  return roles.every((r) => subject.roles.includes(r));
}
