import type { Subject } from "@irondome/core";

/**
 * Contrato para obter o sujeito autenticado a partir do teu runtime (cookies, headers, sessão).
 * Implementações concretas: JWT + cookie, NextAuth session, Clerk `auth()`, etc.
 */
export type GetSubject<TContext = unknown> = (
  context: TContext,
) => Promise<Subject | null> | Subject | null;

export type SessionAdapter<TContext = unknown> = {
  /** Identificador para logging e templates do CLI (ex: `own`, `nextauth`, `clerk`). */
  readonly name: string;
  getSubject: GetSubject<TContext>;
};
