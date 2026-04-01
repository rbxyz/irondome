import type { Subject } from "@irondome/core";

export type StoredUser = {
  id: string;
  email: string;
  passwordHash: string;
  roles: string[];
  orgId: string;
  attributes?: Record<string, unknown>;
};

export type OwnAuthConfig = {
  /** JWT secret — usa `process.env.JWT_SECRET`. */
  jwtSecret: string;
  /** Nome do cookie httpOnly. Default: `irondome_session` */
  cookieName?: string;
  /** Expiração do JWT. Default: `7d` */
  expiresIn?: string;
  /** Busca o utilizador pelo e-mail (ex.: query Drizzle/Prisma). */
  getUserByEmail: (email: string) => Promise<StoredUser | null>;
};

export type SignInResult =
  | { ok: true; token: string; subject: Subject }
  | { ok: false; error: "invalid_credentials" };

export type RegisterData = {
  email: string;
  password: string;
  orgId?: string;
  roles?: string[];
};
