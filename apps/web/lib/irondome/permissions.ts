import {
  actions,
  createPermissions,
  hasRole,
  type Policy,
  Roles,
} from "@irondome/core";

/**
 * Políticas PBAC da demo:
 * - Páginas `/admin` → só `admin`
 * - `/dashboard` → `admin` ou `member`
 * - `/profile` → qualquer utilizador autenticado (viewer incluído)
 * - Ação `invoice:delete` em recurso demo → só `admin`
 */
const pageVisitPolicy: Policy = (subject, action, resource) => {
  if (resource.type !== "page" || action !== actions.page.visit) {
    return null;
  }

  const path = resource.id;

  if (path.startsWith("/admin")) {
    if (hasRole(subject, Roles.admin)) {
      return { allowed: true, reason: "admin route" };
    }
    return { allowed: false, reason: "apenas administradores" };
  }

  if (path.startsWith("/dashboard")) {
    if (hasRole(subject, Roles.admin, Roles.member)) {
      return { allowed: true, reason: "equipa" };
    }
    return { allowed: false, reason: "apenas member ou admin" };
  }

  if (path.startsWith("/profile")) {
    return { allowed: true, reason: "área autenticada" };
  }

  return null;
};

const demoDomainPolicy: Policy = (subject, action, resource) => {
  if (resource.type !== "demo") return null;
  if (action === "invoice:delete") {
    if (hasRole(subject, Roles.admin)) {
      return { allowed: true, reason: "admin pode apagar" };
    }
    return { allowed: false, reason: "só admin pode apagar faturas" };
  }
  return null;
};

export const { can, authorize, evaluate } = createPermissions({
  policies: [pageVisitPolicy, demoDomainPolicy],
  defaultDeny: true,
});
