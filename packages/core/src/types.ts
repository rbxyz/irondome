/** Actor da decisão de política (utilizador, serviço, etc.). */
export type Subject = {
  id: string;
  roles: string[];
  orgId: string;
  attributes?: Record<string, unknown>;
};

/** Recurso alvo da ação. */
export type Resource = {
  type: string;
  id: string;
  ownerId?: string;
  orgId?: string;
  attributes?: Record<string, unknown>;
};

export type Action = string;

export type Context = {
  ip?: string;
  timestamp?: Date;
  environment?: "production" | "staging" | "development" | "test";
  [key: string]: unknown;
};

export type PolicyResult = {
  allowed: boolean;
  reason: string;
};

/**
 * `null` = esta policy não aplica-se a este pedido (passa ao próximo).
 * Valor = decisão (primeira policy não-null ganha).
 */
export type Policy = (
  subject: Subject,
  action: Action,
  resource: Resource,
  context: Context,
) => PolicyResult | null;

export type EvaluateFn = (
  subject: Subject,
  action: Action,
  resource: Resource,
  context?: Context,
) => PolicyResult;
