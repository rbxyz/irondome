import type { Subject } from "@irondome/core";
import { hashPassword, verifyPassword } from "./hash.js";
import { signToken, verifyToken } from "./jwt.js";
import type { OwnAuthConfig, RegisterData, SignInResult, StoredUser } from "./types.js";

export type { OwnAuthConfig, RegisterData, SignInResult, StoredUser };
export { hashPassword, verifyPassword };

export type OwnAuth = {
  /** Nome do cookie onde o token é armazenado. */
  readonly cookieName: string;
  /** Autentica e devolve o token JWT + Subject. */
  signIn: (email: string, password: string) => Promise<SignInResult>;
  /** Verifica um token JWT e devolve o Subject. */
  getSubjectFromToken: (token: string | undefined) => Promise<Subject | null>;
  /** Prepara o hash da senha para criar um novo utilizador. */
  hashPassword: typeof hashPassword;
};

export function createOwnAuth(config: OwnAuthConfig): OwnAuth {
  const secret = config.jwtSecret;
  const cookieName = config.cookieName ?? "irondome_session";
  const expiresIn = config.expiresIn ?? "7d";

  function userToSubject(user: StoredUser): Subject {
    return {
      id: user.id,
      roles: user.roles,
      orgId: user.orgId,
      attributes: user.attributes,
    };
  }

  async function signIn(email: string, password: string): Promise<SignInResult> {
    const user = await config.getUserByEmail(email.toLowerCase());

    // timing-safe rejection even when user is not found
    const dummyHash = "$2a$12$invalidhashplaceholderXXXXXXXXXXXXXXXXXXXXXXXX";
    const valid = await verifyPassword(password, user?.passwordHash ?? dummyHash);

    if (!user || !valid) {
      return { ok: false, error: "invalid_credentials" };
    }

    const subject = userToSubject(user);
    const token = await signToken(
      { sub: user.id, roles: user.roles, orgId: user.orgId, attributes: user.attributes },
      secret,
      expiresIn,
    );

    return { ok: true, token, subject };
  }

  async function getSubjectFromToken(
    token: string | undefined,
  ): Promise<Subject | null> {
    if (!token) return null;
    const payload = await verifyToken(token, secret);
    if (!payload) return null;
    return {
      id: payload.sub,
      roles: payload.roles,
      orgId: payload.orgId,
      attributes: payload.attributes,
    };
  }

  return { cookieName, signIn, getSubjectFromToken, hashPassword };
}
