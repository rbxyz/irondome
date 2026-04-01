import { createOwnAuth } from "@irondome/auth";
import { getDemoUsersDb } from "./db";

export const ownAuth = createOwnAuth({
  jwtSecret: process.env["JWT_SECRET"] ?? "demo-secret-change-in-production",
  cookieName: "irondome_session",
  expiresIn: "7d",
  getUserByEmail: async (email) => {
    const db = await getDemoUsersDb();
    return db.get(email.toLowerCase()) ?? null;
  },
});
