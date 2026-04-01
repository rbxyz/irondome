import type { Resource, Subject } from "./types.js";

/**
 * Cargo / posição hierárquica em painéis administrativos.
 * Usa `subject.attributes.position` (string) e compara com {@link POSITION_RANK}.
 */
export const PanelPosition = {
  owner: "owner",
  admin: "admin",
  manager: "manager",
  staff: "staff",
  viewer: "viewer",
} as const;

export type PanelPositionName = (typeof PanelPosition)[keyof typeof PanelPosition];

/**
 * Ordem numérica: maior = mais privilégio.
 * Ajusta à tua organização (ex.: injetar mapa por tenant).
 */
export const POSITION_RANK: Record<string, number> = {
  [PanelPosition.owner]: 100,
  [PanelPosition.admin]: 90,
  [PanelPosition.manager]: 60,
  [PanelPosition.staff]: 40,
  [PanelPosition.viewer]: 10,
};

const ATTR_KEY = "position";

/** Lê `subject.attributes.position` (string). */
export function getSubjectPosition(subject: Subject): string | undefined {
  const v = subject.attributes?.[ATTR_KEY];
  return typeof v === "string" ? v : undefined;
}

/**
 * Verifica se o cargo do sujeito é **>=** ao mínimo exigido (por {@link POSITION_RANK}).
 * Posições desconhecidas contam como rank `0`.
 */
export function hasMinimumPosition(subject: Subject, minPosition: string): boolean {
  const current = getSubjectPosition(subject);
  const rank = current !== undefined ? (POSITION_RANK[current] ?? 0) : 0;
  const min = POSITION_RANK[minPosition] ?? 0;
  return rank >= min;
}

/** Recurso de painel (rotas `/painel/...`, `/admin/...`, etc.). */
export function panelResource(pathname: string): Resource {
  const id =
    pathname === "" ? "/" : pathname.startsWith("/") ? pathname : `/${pathname}`;
  return {
    type: "panel",
    id,
    attributes: { section: "panel" },
  };
}
