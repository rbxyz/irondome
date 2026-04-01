import Link from "next/link";
import { getServerSubject } from "@/lib/irondome/server-subject";

export default async function ProfilePage() {
  const subject = await getServerSubject();

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Perfil</h1>
      <p>Qualquer utilizador autenticado (inclui viewer).</p>
      <p>
        Sessão demo: <code>{subject?.id}</code> — roles:{" "}
        <code>{subject?.roles.join(", ")}</code>
      </p>
      <Link href="/">← Início</Link>
    </main>
  );
}
