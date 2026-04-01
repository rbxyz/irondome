import type { Action, EvaluateFn, PolicyResult, Resource, Subject } from "@irondome/core";
import { UnauthorizedError } from "@irondome/core";

export type IrondomeContext = {
  subject: Subject | null;
  /** Avalia permissão sem lançar erro. */
  can: (action: Action, resource: Resource) => PolicyResult;
  /** Avalia e lança {@link UnauthorizedError} se negado. */
  authorize: (action: Action, resource: Resource) => PolicyResult;
};

/**
 * Constrói a extensão de contexto tRPC com `can` e `authorize`.
 * Inclui no `createContext` do tRPC:
 *
 * ```ts
 * // server/api/trpc.ts
 * import { createIrondomeContext } from "@irondome/next/trpc";
 * import { can } from "@/lib/irondome/permissions";
 *
 * export const createTRPCContext = async (opts: CreateNextContextOptions) => {
 *   const subject = await getServerSubject(); // ou adapter Clerk/NextAuth
 *   return { ...createIrondomeContext(can, subject) };
 * };
 * ```
 */
export function createIrondomeContext(
  evaluate: EvaluateFn,
  subject: Subject | null,
): IrondomeContext {
  return {
    subject,
    can: (action, resource) =>
      subject
        ? evaluate(subject, action, resource)
        : { allowed: false, reason: "unauthenticated" },
    authorize: (action, resource) => {
      if (!subject) throw new UnauthorizedError("Not authenticated");
      const result = evaluate(subject, action, resource);
      if (!result.allowed) throw new UnauthorizedError(result.reason);
      return result;
    },
  };
}

/**
 * Middleware para tRPC (v10/v11) que verifica uma permissão PBAC.
 * Funciona com qualquer procedure que tenha `ctx.subject` preenchido.
 *
 * ```ts
 * const canDeletePost = irondomePermission(
 *   can,
 *   "resource:delete",
 *   (input: { postId: string }) => namedResource("post", input.postId),
 * );
 * export const deletePostProcedure = protectedProcedure
 *   .input(z.object({ postId: z.string() }))
 *   .use(canDeletePost)
 *   .mutation(async ({ input }) => { ... });
 * ```
 */
export function irondomePermission<TInput = unknown>(
  evaluate: EvaluateFn,
  action: Action,
  getResource: (input: TInput) => Resource,
) {
  return async (opts: {
    ctx: { subject?: Subject | null };
    next: (o?: { ctx: unknown }) => Promise<unknown>;
    input: TInput;
  }) => {
    const subject = opts.ctx.subject ?? null;
    if (!subject) throw new UnauthorizedError("Not authenticated");
    const resource = getResource(opts.input);
    const result = evaluate(subject, action, resource);
    if (!result.allowed) throw new UnauthorizedError(result.reason);
    return opts.next({ ctx: opts.ctx });
  };
}
