/**
 * Edge-compatible JWT helpers (apenas `jose` — sem bcrypt).
 * Usa este sub-path no middleware Next.js:
 *   `import { verifyToken } from "@irondome/auth/jwt"`
 */
export { signToken, verifyToken } from "./own/jwt.js";
export type { TokenPayload } from "./own/jwt.js";
