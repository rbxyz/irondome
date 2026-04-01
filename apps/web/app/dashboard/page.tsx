import Link from "next/link";
import { getServerSubject } from "@/lib/irondome/server-subject";

export default async function DashboardPage() {
  const subject = await getServerSubject();

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Dashboard</h1>
      <p>
        Acessível a <code>admin</code> ou <code>member</code>.
      </p>
      <p>
        Sessão demo: <code>{subject?.roles.join(", ")}</code>
      </p>
      <Link href="/">← Início</Link>
    </main>
  );
}
