import type { Action, EvaluateFn, Resource, Subject } from "@irondome/core";
import { NextResponse, type NextRequest } from "next/server";

export type RoutePermissionRule = {
  /** Se devolver true, esta regra aplica-se ao pathname. */
  match: (pathname: string) => boolean;
  action: Action;
  resource: (pathname: string) => Resource;
};

export type CreateRoutePermissionMiddlewareOptions = {
  getSubject: (req: NextRequest) => Promise<Subject | null>;
  can: EvaluateFn;
  /** Avaliadas por ordem; a primeira que fizer match ganha. */
  rules: RoutePermissionRule[];
  /**
   * Caminhos públicos (sem avaliação). Aceita prefixo se terminar com `*`,
   * ex.: `/public/*` corresponde a `/public/foo`.
   */
  publicPaths?: string[];
  /** Sem regra correspondente: permite passar (default) ou redirecionar. */
  defaultBehavior?: "allow" | "forbid";
  redirectWhenUnauthenticated?: string;
  redirectWhenForbidden?: string;
};

function matchesPublicPath(pathname: string, patterns: string[]): boolean {
  for (const p of patterns) {
    if (p.endsWith("/*")) {
      const base = p.slice(0, -2);
      if (pathname === base || pathname.startsWith(`${base}/`)) {
        return true;
      }
    } else if (pathname === p) {
      return true;
    }
  }
  return false;
}

/**
 * Middleware Next.js: protege rotas com o mesmo motor PBAC (`can`) usado em APIs e UI.
 */
export function createRoutePermissionMiddleware(
  options: CreateRoutePermissionMiddlewareOptions,
): (req: NextRequest) => Promise<NextResponse> {
  const publicPaths = options.publicPaths ?? ["/"];
  const unauth = options.redirectWhenUnauthenticated ?? "/?irondome=login";
  const forbidden = options.redirectWhenForbidden ?? "/?irondome=forbidden";

  return async (req: NextRequest) => {
    const { pathname } = req.nextUrl;

    if (matchesPublicPath(pathname, publicPaths)) {
      return NextResponse.next();
    }

    const rule = options.rules.find((r) => r.match(pathname));
    if (!rule) {
      if (options.defaultBehavior === "forbid") {
        return NextResponse.redirect(new URL(forbidden, req.url));
      }
      return NextResponse.next();
    }

    const subject = await options.getSubject(req);
    if (!subject) {
      return NextResponse.redirect(new URL(unauth, req.url));
    }

    const resource = rule.resource(pathname);
    const result = options.can(subject, rule.action, resource, {});

    if (!result.allowed) {
      const url = new URL(forbidden, req.url);
      url.searchParams.set("reason", encodeURIComponent(result.reason));
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  };
}
