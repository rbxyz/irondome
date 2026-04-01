import type { Subject } from "@irondome/core";

/** Shape mínima do retorno de `auth()` do Clerk — não importa @clerk/nextjs. */
type ClerkAuthResult = {
  userId: string | null;
  orgId?: string | null;
  sessionClaims?: {
    metadata?: { roles?: string[]; [key: string]: unknown };
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type ClerkAdapterOptions = {
  /** Extrai roles do sessionClaims. Padrão: `sessionClaims.metadata.roles ?? ['user']`. */
  getRoles?: (auth: ClerkAuthResult) => string[];
  /** orgId por omissão quando não definido. */
  defaultOrgId?: string;
};

/**
 * Converte o retorno de `auth()` do Clerk num {@link Subject} Irondome.
 *
 * ```ts
 * // app/api/route.ts
 * import { auth } from '@clerk/nextjs/server';
 * const subject = clerkToSubject(await auth());
 * ```
 */
export function clerkToSubject(
  clerkAuth: ClerkAuthResult | null | undefined,
  opts?: ClerkAdapterOptions,
): Subject | null {
  if (!clerkAuth?.userId) return null;

  return {
    id: clerkAuth.userId,
    roles:
      opts?.getRoles?.(clerkAuth) ??
      clerkAuth.sessionClaims?.metadata?.roles ??
      ["user"],
    orgId: clerkAuth.orgId ?? opts?.defaultOrgId ?? "default",
  };
}
