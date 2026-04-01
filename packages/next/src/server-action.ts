import type { Action, EvaluateFn, Resource, Subject } from "@irondome/core";
import { UnauthorizedError } from "@irondome/core";

export type ActionContext = {
  subject: Subject;
};

/**
 * Envolve um Server Action com verificação de permissão PBAC.
 *
 * ```ts
 * // app/actions/post.ts
 * "use server";
 * import { withPermission } from "@irondome/next/server-action";
 *
 * export const deletePost = withPermission(
 *   async (ctx, input: { id: string }) => {
 *     await db.post.delete({ where: { id: input.id } });
 *     return { deleted: true };
 *   },
 *   {
 *     getSubject: () => getServerSubject(),
 *     can,
 *     action: "resource:delete",
 *     resource: (_, input) => namedResource("post", input.id),
 *   },
 * );
 * ```
 */
export function withPermission<TInput, TOutput>(
  fn: (ctx: ActionContext, input: TInput) => Promise<TOutput>,
  opts: {
    getSubject: () => Promise<Subject | null> | Subject | null;
    can: EvaluateFn;
    action: Action;
    resource: Resource | ((ctx: ActionContext, input: TInput) => Resource);
  },
): (input: TInput) => Promise<TOutput> {
  return async (input: TInput) => {
    const subject = await opts.getSubject();
    if (!subject) throw new UnauthorizedError("Not authenticated");

    const ctx: ActionContext = { subject };
    const resource =
      typeof opts.resource === "function" ? opts.resource(ctx, input) : opts.resource;

    const result = opts.can(subject, opts.action, resource);
    if (!result.allowed) throw new UnauthorizedError(result.reason);

    return fn(ctx, input);
  };
}
