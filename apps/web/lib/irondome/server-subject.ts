import type { Subject } from "@irondome/core";
import { cookies } from "next/headers";
import { ownAuth } from "./own-auth";

/** Subject na Server Component / Server Action via cookie JWT. */
export async function getServerSubject(): Promise<Subject | null> {
  const jar = await cookies();
  const token = jar.get(ownAuth.cookieName)?.value;
  return ownAuth.getSubjectFromToken(token);
}
