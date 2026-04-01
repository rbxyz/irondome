export { PolicyEngine, UnauthorizedError } from "./engine.js";
export { createPermissions } from "./factory.js";
export type {
  Action,
  Context,
  EvaluateFn,
  Policy,
  PolicyResult,
  Resource,
  Subject,
} from "./types.js";
export type { CreatePermissionsOptions, PermissionsApi } from "./factory.js";

// Catálogo: roles, actions, helpers
export {
  actions,
  hasEveryRole,
  hasRole,
  namedResource,
  pageResource,
  Roles,
} from "./catalog.js";
export type { RoleName } from "./catalog.js";

// ReBAC
export {
  checkRelation,
  MemoryRelationStore,
} from "./rebac.js";
export type { RelationStore, RelationTuple } from "./rebac.js";

// Audit
export { createConsoleAuditHook } from "./audit.js";
export type { AuditEvent, AuditHook } from "./audit.js";
