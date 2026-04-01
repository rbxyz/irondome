import { SignJWT, jwtVerify } from "jose";

export type TokenPayload = {
  sub: string;
  roles: string[];
  orgId: string;
  attributes?: Record<string, unknown>;
};

function encodeSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signToken(
  payload: TokenPayload,
  secret: string,
  expiresIn = "7d",
): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(encodeSecret(secret));
}

export async function verifyToken(
  token: string,
  secret: string,
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodeSecret(secret));
    if (
      typeof payload.sub !== "string" ||
      !Array.isArray(payload["roles"]) ||
      typeof payload["orgId"] !== "string"
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      roles: payload["roles"] as string[],
      orgId: payload["orgId"] as string,
      attributes: payload["attributes"] as Record<string, unknown> | undefined,
    };
  } catch {
    return null;
  }
}
