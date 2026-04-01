export type { GetSubject, SessionAdapter } from "./adapters.js";
export { toSubject } from "./subject.js";
export type { MinimalUser } from "./subject.js";

// Auth próprio (bcrypt + jose)
export { createOwnAuth, hashPassword, verifyPassword } from "./own/auth.js";
export type {
  OwnAuth,
  OwnAuthConfig,
  RegisterData,
  SignInResult,
  StoredUser,
} from "./own/auth.js";

// JWT (edge-safe — re-exported para conveniência)
export { signToken, verifyToken } from "./own/jwt.js";
export type { TokenPayload } from "./own/jwt.js";

// Adapters de providers externos
export { nextAuthToSubject } from "./adapters/nextauth.js";
export type { NextAuthAdapterOptions } from "./adapters/nextauth.js";

export { clerkToSubject } from "./adapters/clerk.js";
export type { ClerkAdapterOptions } from "./adapters/clerk.js";

// Re-export de tipos core para conveniência
export type { Subject, Resource, Action, Context, PolicyResult } from "@irondome/core";
