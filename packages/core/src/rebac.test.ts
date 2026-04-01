import { describe, expect, it } from "vitest";
import { MemoryRelationStore, checkRelation } from "./rebac.js";

describe("ReBAC", () => {
  it("relação direta: positivo", async () => {
    const store = new MemoryRelationStore();
    store.add({ subject: "user:alice", relation: "member", object: "team:eng" });
    expect(await checkRelation(store, "user:alice", "member", "team:eng")).toBe(true);
  });

  it("relação direta: negativo", async () => {
    const store = new MemoryRelationStore();
    store.add({ subject: "user:alice", relation: "member", object: "team:eng" });
    expect(await checkRelation(store, "user:alice", "owner", "team:eng")).toBe(false);
  });

  it("cadeia transitiva via uma relação", async () => {
    const store = new MemoryRelationStore();
    store.add(
      { subject: "user:alice", relation: "member", object: "team:eng" },
      { subject: "team:eng", relation: "owner", object: "repo:api" },
    );
    expect(
      await checkRelation(store, "user:alice", "owner", "repo:api", { via: ["member"] }),
    ).toBe(true);
  });

  it("cadeia de dois saltos", async () => {
    const store = new MemoryRelationStore();
    store.add(
      { subject: "user:alice", relation: "member", object: "team:eng" },
      { subject: "team:eng", relation: "member", object: "project:irondome" },
      { subject: "project:irondome", relation: "owner", object: "repo:api" },
    );
    expect(
      await checkRelation(store, "user:alice", "owner", "repo:api", { via: ["member"] }),
    ).toBe(true);
  });

  it("sem via, não atravessa cadeia", async () => {
    const store = new MemoryRelationStore();
    store.add(
      { subject: "user:alice", relation: "member", object: "team:eng" },
      { subject: "team:eng", relation: "owner", object: "repo:api" },
    );
    expect(await checkRelation(store, "user:alice", "owner", "repo:api")).toBe(false);
  });

  it("remove tupla", async () => {
    const store = new MemoryRelationStore();
    store.add({ subject: "user:alice", relation: "member", object: "team:eng" });
    store.remove({ subject: "user:alice", relation: "member", object: "team:eng" });
    expect(await checkRelation(store, "user:alice", "member", "team:eng")).toBe(false);
  });
});
