import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { InvoiceDeleteDemo } from "@/components/invoice-delete-demo";
import { getServerSubject } from "@/lib/irondome/server-subject";

export default async function Home() {
  const subject = await getServerSubject();

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", padding: "0 1rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>Irondome — demo</h1>
      <p style={{ lineHeight: 1.5, color: "#555", marginBottom: "1.5rem" }}>
        PBAC + auth próprio (bcrypt + JWT) + proteção de rotas via middleware.
      </p>

      {subject ? (
        <section style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "1rem", marginBottom: "1.5rem" }}>
          <strong>Sessão ativa</strong>
          <pre style={{ margin: "0.5rem 0 0", fontSize: "0.85rem" }}>
            {JSON.stringify({ id: subject.id, roles: subject.roles, orgId: subject.orgId }, null, 2)}
          </pre>
        </section>
      ) : (
        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem" }}>Login</h2>
          <p style={{ fontSize: "0.9rem", color: "#666" }}>
            Contas demo: <code>admin@demo.com</code> / <code>admin123</code> ·{" "}
            <code>member@demo.com</code> / <code>member123</code> ·{" "}
            <code>viewer@demo.com</code> / <code>viewer123</code>
          </p>
          <LoginForm />
        </section>
      )}

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem" }}>Páginas protegidas por role</h2>
        <ul style={{ paddingLeft: "1.25rem", lineHeight: 2 }}>
          <li><Link href="/admin">/admin</Link> — só <code>admin</code></li>
          <li><Link href="/dashboard">/dashboard</Link> — <code>admin</code> ou <code>member</code></li>
          <li><Link href="/profile">/profile</Link> — qualquer autenticado</li>
        </ul>
      </section>

      <section>
        <h2 style={{ fontSize: "1.1rem" }}>Ação protegida (API)</h2>
        <p style={{ fontSize: "0.9rem", color: "#666" }}>
          <code>DELETE /api/demo/invoice</code> — só <code>admin</code> pode apagar.
        </p>
        <InvoiceDeleteDemo />
      </section>
    </main>
  );
}
