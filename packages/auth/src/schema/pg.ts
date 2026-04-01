import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const irondomeUsers = pgTable("irondome_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  roles: text("roles")
    .array()
    .notNull()
    .$default(() => ["user"]),
  orgId: text("org_id").notNull().default("default"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type IrondomeUser = typeof irondomeUsers.$inferSelect;
export type NewIrondomeUser = typeof irondomeUsers.$inferInsert;
