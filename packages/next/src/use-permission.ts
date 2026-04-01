"use client";

import type { Action, Context, EvaluateFn, Resource, Subject } from "@irondome/core";
import { useMemo } from "react";

export type UsePermissionResult =
  | { allowed: true; reason: string }
  | { allowed: false; reason: string };

/**
 * Liga o motor PBAC ao React. Passa o `subject` vindo da tua sessão (ou `null` se não autenticado).
 */
export function usePermission(
  evaluate: EvaluateFn,
  subject: Subject | null | undefined,
  action: Action,
  resource: Resource,
  context?: Context,
): UsePermissionResult {
  return useMemo(() => {
    if (subject == null) {
      return { allowed: false, reason: "unauthenticated" };
    }
    return evaluate(subject, action, resource, context ?? {});
  }, [evaluate, subject, action, resource, context]);
}
