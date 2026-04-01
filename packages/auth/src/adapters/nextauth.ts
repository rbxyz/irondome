import type { Subject } from "@irondome/core";

/** Shape mínima da sessão NextAuth — não importa o pacote para evitar peer obrigatório. */
type NextAuthSession = {
  user?: {
    id?: string | null;
    email?: string | null;
    name?: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type NextAuthAdapterOptions = {
  /** Extrai os roles do user/session. Padrão: `['user']`. */
  getRoles?: (session: NextAuthSession) => string[];
  /** orgId por omissão quando não presente na sessão. */
  defaultOrgId?: string;
};

/**
 * Converte uma sessão NextAuth num {@link Subject} Irondome.
 *
 * ```ts
 * // app/api/trpc/[trpc]/route.ts
 * const session = await getServerSession(authOptions);
 * const subject = nextAuthToSubject(session, { getRoles: (s) => s.user?.roles ?? ['user'] });
 * ```
 */
export function nextAuthToSubject(
  session: NextAuthSession | null | undefined,
  opts?: NextAuthAdapterOptions,
): Subject | null {
  const id = session?.user?.id;
  if (!id || typeof id !== "string") return null;

  return {
    id,
    roles: opts?.getRoles?.(session!) ?? ["user"],
    orgId:
      (session!.user?.["orgId"] as string | undefined) ??
      opts?.defaultOrgId ??
      "default",
    attributes: session!.user as Record<string, unknown>,
  };
}
