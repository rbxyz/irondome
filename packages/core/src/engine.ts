import type {
  Action,
  Context,
  Policy,
  PolicyResult,
  Resource,
  Subject,
} from "./types.js";

const emptyContext: Context = {};

export class PolicyEngine {
  private policies: Policy[] = [];

  register(...policies: Policy[]): this {
    this.policies.push(...policies);
    return this;
  }

  evaluate(
    subject: Subject,
    action: Action,
    resource: Resource,
    context: Context = emptyContext,
  ): PolicyResult {
    for (const policy of this.policies) {
      const result = policy(subject, action, resource, context);
      if (result !== null) {
        return result;
      }
    }
    return {
      allowed: false,
      reason: "no policy matched — default deny",
    };
  }

  authorize(
    subject: Subject,
    action: Action,
    resource: Resource,
    context: Context = emptyContext,
  ): PolicyResult {
    const result = this.evaluate(subject, action, resource, context);
    if (!result.allowed) {
      throw new UnauthorizedError(result.reason);
    }
    return result;
  }
}

export class UnauthorizedError extends Error {
  readonly name = "UnauthorizedError";

  constructor(message: string) {
    super(message);
  }
}
