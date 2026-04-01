import type { AuditHook } from "./audit.js";
import { PolicyEngine, UnauthorizedError as IrondomeAuthError } from "./engine.js";
import type {
  Action,
  Context,
  EvaluateFn,
  Policy,
  PolicyResult,
  Resource,
  Subject,
} from "./types.js";

export type CreatePermissionsOptions = {
  policies: Policy[];
  /** Nega por omissão quando nenhuma policy aplica. @default true */
  defaultDeny?: boolean;
  /**
   * Hook chamado após cada avaliação (fire-and-forget para async).
   * Usa para auditoria, logging, métricas.
   */
  audit?: AuditHook;
};

export type PermissionsApi = {
  evaluate: EvaluateFn;
  authorize: (
    subject: Subject,
    action: Action,
    resource: Resource,
    context?: Context,
  ) => PolicyResult;
  /** Alias de `evaluate` — legível em condicionais UI. */
  can: EvaluateFn;
};

export function createPermissions(
  options: CreatePermissionsOptions,
): PermissionsApi {
  const engine = new PolicyEngine();
  engine.register(...options.policies);

  function fireAudit(
    subject: Subject,
    action: Action,
    resource: Resource,
    result: PolicyResult,
    context: Context,
  ): void {
    if (!options.audit) return;
    const event = { subject, action, resource, result, context, timestamp: new Date() };
    const ret = options.audit(event);
    if (ret instanceof Promise) {
      ret.catch((err: unknown) => console.error("[irondome] audit hook error", err));
    }
  }

  const evaluate: EvaluateFn = (subject, action, resource, context = {}) => {
    const result = engine.evaluate(subject, action, resource, context);
    fireAudit(subject, action, resource, result, context);
    return result;
  };

  return {
    evaluate,
    can: evaluate,
    authorize: (subject, action, resource, context = {}) => {
      const result = engine.evaluate(subject, action, resource, context);
      fireAudit(subject, action, resource, result, context);
      if (!result.allowed) {
        throw new IrondomeAuthError(result.reason);
      }
      return result;
    },
  };
}
