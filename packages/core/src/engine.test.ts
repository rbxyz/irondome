import { describe, expect, it } from "vitest";
import { PolicyEngine, UnauthorizedError } from "./engine.js";
import type { Policy } from "./types.js";

const subject = (overrides?: Partial<{ id: string; roles: string[]; orgId: string }>) => ({
  id: "u1",
  roles: ["user"],
  orgId: "o1",
  ...overrides,
});

const post = (overrides?: Partial<{ id: string; ownerId: string; orgId: string }>) => ({
  type: "post",
  id: "p1",
  ownerId: "u1",
  orgId: "o1",
  ...overrides,
});

const postsPolicy: Policy = (s, action, resource, _ctx) => {
  if (resource.type !== "post") return null;
  if (action === "update" && resource.ownerId === s.id) {
    return { allowed: true, reason: "owner" };
  }
  if (s.roles.includes("admin") && resource.orgId === s.orgId) {
    return { allowed: true, reason: "admin" };
  }
  return { allowed: false, reason: "denied" };
};

describe("PolicyEngine", () => {
  it("returns first non-null policy result", () => {
    const engine = new PolicyEngine().register(postsPolicy);
    const r = engine.evaluate(subject(), "update", post());
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe("owner");
  });

  it("default deny when no policy matches", () => {
    const engine = new PolicyEngine().register(postsPolicy);
    const r = engine.evaluate(subject({ id: "other" }), "update", post({ ownerId: "u1" }));
    expect(r.allowed).toBe(false);
  });

  it("skips policies that return null", () => {
    const noop: Policy = () => null;
    const engine = new PolicyEngine().register(noop, postsPolicy);
    expect(engine.evaluate(subject(), "update", post()).allowed).toBe(true);
  });

  it("authorize throws UnauthorizedError when denied", () => {
    const engine = new PolicyEngine().register(postsPolicy);
    expect(() =>
      engine.authorize(subject({ id: "other" }), "update", post({ ownerId: "u1" })),
    ).toThrow(UnauthorizedError);
  });
});
