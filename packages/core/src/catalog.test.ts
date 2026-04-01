import { describe, expect, it } from "vitest";
import { hasEveryRole, hasRole, pageResource, Roles } from "./catalog.js";
import type { Subject } from "./types.js";

const subject = (roles: string[]): Subject => ({
  id: "u1",
  roles,
  orgId: "o1",
});

describe("catalog", () => {
  it("pageResource normalizes id", () => {
    expect(pageResource("/admin").id).toBe("/admin");
    expect(pageResource("admin").id).toBe("/admin");
  });

  it("hasRole", () => {
    expect(hasRole(subject([Roles.admin]), Roles.admin)).toBe(true);
    expect(hasRole(subject([Roles.member]), Roles.admin)).toBe(false);
    expect(hasRole(subject([Roles.member, Roles.admin]), Roles.admin)).toBe(true);
  });

  it("hasEveryRole", () => {
    expect(hasEveryRole(subject(["a", "b"]), "a", "b")).toBe(true);
    expect(hasEveryRole(subject(["a"]), "a", "b")).toBe(false);
  });
});
