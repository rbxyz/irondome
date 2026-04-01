import { describe, expect, it } from "vitest";
import {
  PanelPosition,
  getSubjectPosition,
  hasMinimumPosition,
  panelResource,
} from "./panel.js";
import type { Subject } from "./types.js";

const subjectWithPosition = (position: string): Subject => ({
  id: "u1",
  roles: ["member"],
  orgId: "o1",
  attributes: { position },
});

describe("panel / posição", () => {
  it("getSubjectPosition", () => {
    expect(getSubjectPosition(subjectWithPosition(PanelPosition.manager))).toBe(
      PanelPosition.manager,
    );
    expect(getSubjectPosition({ id: "x", roles: [], orgId: "o" })).toBeUndefined();
  });

  it("hasMinimumPosition — manager >= staff", () => {
    expect(
      hasMinimumPosition(subjectWithPosition(PanelPosition.manager), PanelPosition.staff),
    ).toBe(true);
  });

  it("hasMinimumPosition — viewer < admin", () => {
    expect(
      hasMinimumPosition(subjectWithPosition(PanelPosition.viewer), PanelPosition.admin),
    ).toBe(false);
  });

  it("panelResource", () => {
    expect(panelResource("/painel/config").type).toBe("panel");
    expect(panelResource("painel/config").id).toBe("/painel/config");
  });
});
