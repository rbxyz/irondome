import type { Action, Context, PolicyResult, Resource, Subject } from "./types.js";

export type AuditEvent = {
  subject: Subject;
  action: Action;
  resource: Resource;
  result: PolicyResult;
  context: Context;
  timestamp: Date;
};

export type AuditHook = (event: AuditEvent) => void | Promise<void>;

/**
 * Hook de auditoria que imprime no console.
 * Útil para dev; em produção liga a uma tabela ou serviço externo.
 */
export function createConsoleAuditHook(opts?: { onlyDenied?: boolean }): AuditHook {
  return ({ subject, action, resource, result }) => {
    if (opts?.onlyDenied && result.allowed) return;
    const icon = result.allowed ? "✓" : "✗";
    const roles = subject.roles.join(",");
    console.log(
      `[irondome] ${icon} ${subject.id}(${roles}) ${action} ${resource.type}:${resource.id} — ${result.reason}`,
    );
  };
}
