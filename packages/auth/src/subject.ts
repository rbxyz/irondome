import type { Subject } from "@irondome/core";

export type MinimalUser = {
  id: string;
  roles: string[];
  orgId: string;
  attributes?: Record<string, unknown>;
};

/** Constrói um {@link Subject} a partir de um modelo de utilizador da tua app. */
export function toSubject(user: MinimalUser): Subject {
  return {
    id: user.id,
    roles: user.roles,
    orgId: user.orgId,
    attributes: user.attributes,
  };
}
