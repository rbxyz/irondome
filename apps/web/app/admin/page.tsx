import Link from "next/link";
import { getServerSubject } from "@/lib/irondome/server-subject";

export default async function AdminPage() {
  const subject = await getServerSubject();

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Admin</h1>
      <p>
        Só utilizadores com role <code>admin</code> chegam aqui (middleware + policy).
      </p>
      <p>
        Sessão demo: <code>{subject?.roles.join(", ")}</code>
      </p>
      <Link href="/">← Início</Link>
    </main>
  );
}
