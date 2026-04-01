/**
 * Banco de utilizadores em memória (DEMO).
 * Em produção, substitui por Drizzle/Prisma com irondome_users.
 */
import { hashPassword, type StoredUser } from "@irondome/auth";

type UserMap = Map<string, StoredUser>;

let _db: UserMap | null = null;

export async function getDemoUsersDb(): Promise<UserMap> {
  if (_db) return _db;

  const [adminHash, memberHash, viewerHash] = await Promise.all([
    hashPassword("admin123"),
    hashPassword("member123"),
    hashPassword("viewer123"),
  ]);

  _db = new Map<string, StoredUser>([
    [
      "admin@demo.com",
      {
        id: "user-admin",
        email: "admin@demo.com",
        passwordHash: adminHash,
        roles: ["admin"],
        orgId: "demo-org",
      },
    ],
    [
      "member@demo.com",
      {
        id: "user-member",
        email: "member@demo.com",
        passwordHash: memberHash,
        roles: ["member"],
        orgId: "demo-org",
      },
    ],
    [
      "viewer@demo.com",
      {
        id: "user-viewer",
        email: "viewer@demo.com",
        passwordHash: viewerHash,
        roles: ["viewer"],
        orgId: "demo-org",
      },
    ],
  ]);

  return _db;
}
