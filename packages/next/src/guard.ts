import type {
  Action,
  Context,
  EvaluateFn,
  PolicyResult,
  Resource,
  Subject,
} from "@irondome/core";
import type { NextRequest } from "next/server";

export type ResourceResolver = (
  req: NextRequest,
) => Resource | Promise<Resource>;

export type ContextResolver = (
  req: NextRequest,
) => Context | Promise<Context>;

export type PermissionGuardOptions = {
  evaluate: EvaluateFn;
  getSubject: (req: NextRequest) => Promise<Subject | null>;
  action: Action;
  resolveResource: ResourceResolver;
  getContext?: ContextResolver;
};

/**
 * Avalia PBAC para um pedido HTTP. Não envolve `NextResponse` — podes mapear o resultado no handler.
 */
export async function runPermissionGuard(
  options: PermissionGuardOptions,
  req: NextRequest,
): Promise<PolicyResult | { allowed: false; reason: "unauthenticated" }> {
  const subject = await options.getSubject(req);
  if (!subject) {
    return { allowed: false, reason: "unauthenticated" };
  }
  const resource = await options.resolveResource(req);
  const context = options.getContext ? await options.getContext(req) : {};
  return options.evaluate(subject, options.action, resource, context);
}
