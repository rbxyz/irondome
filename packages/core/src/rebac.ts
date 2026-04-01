/**
 * ReBAC — Relation-Based Access Control
 *
 * Modela relações como tuplas `(subject, relation, object)` e permite
 * verificar acessos por cadeia de relações (estilo Google Zanzibar).
 *
 * Formato de entidade: `type:id`  ex.: `user:alice`, `team:eng`, `repo:api`
 */

export type RelationTuple = {
  /** ex.: `user:alice` ou `team:eng#member` */
  subject: string;
  /** ex.: `member`, `owner`, `viewer` */
  relation: string;
  /** ex.: `repo:api`, `org:acme` */
  object: string;
};

export interface RelationStore {
  /** Devolve tuplas que correspondem ao critério parcial. */
  find(partial: Partial<RelationTuple>): Promise<RelationTuple[]> | RelationTuple[];
}

/**
 * Store em memória — ideal para testes e demos sem base de dados.
 */
export class MemoryRelationStore implements RelationStore {
  private tuples: RelationTuple[] = [];

  add(...tuples: RelationTuple[]): this {
    this.tuples.push(...tuples);
    return this;
  }

  remove(partial: Partial<RelationTuple>): this {
    this.tuples = this.tuples.filter(
      (t) =>
        !(
          (!partial.subject || t.subject === partial.subject) &&
          (!partial.relation || t.relation === partial.relation) &&
          (!partial.object || t.object === partial.object)
        ),
    );
    return this;
  }

  find(partial: Partial<RelationTuple>): RelationTuple[] {
    return this.tuples.filter(
      (t) =>
        (!partial.subject || t.subject === partial.subject) &&
        (!partial.relation || t.relation === partial.relation) &&
        (!partial.object || t.object === partial.object),
    );
  }

  clear(): this {
    this.tuples = [];
    return this;
  }
}

/**
 * Verifica se `subject` tem `relation` em `object`.
 * Com `via`, percorre cadeia de relações por BFS (ex.: member → owner).
 *
 * @example
 * ```ts
 * store.add(
 *   { subject: 'user:alice', relation: 'member', object: 'team:eng' },
 *   { subject: 'team:eng',   relation: 'owner',  object: 'repo:api' },
 * );
 * await checkRelation(store, 'user:alice', 'owner', 'repo:api', { via: ['member'] });
 * // → true
 * ```
 */
export async function checkRelation(
  store: RelationStore,
  subject: string,
  relation: string,
  object: string,
  opts?: { via?: string[]; maxDepth?: number },
): Promise<boolean> {
  const maxDepth = opts?.maxDepth ?? 10;
  const via = opts?.via ?? [];

  const direct = await store.find({ subject, relation, object });
  if (direct.length > 0) return true;
  if (via.length === 0) return false;

  // BFS por relações transitivas
  const visited = new Set<string>();
  const queue: Array<{ entity: string; depth: number }> = [
    { entity: subject, depth: 0 },
  ];

  while (queue.length > 0) {
    const { entity, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    for (const viaRelation of via) {
      const tuples = await store.find({ subject: entity, relation: viaRelation });
      for (const t of tuples) {
        const key = `${t.object}||${viaRelation}`;
        if (visited.has(key)) continue;
        visited.add(key);

        const found = await store.find({
          subject: t.object,
          relation,
          object,
        });
        if (found.length > 0) return true;

        queue.push({ entity: t.object, depth: depth + 1 });
      }
    }
  }

  return false;
}
