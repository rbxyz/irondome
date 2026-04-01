"use client";

import { useState } from "react";

export function InvoiceDeleteDemo() {
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setMsg(null);
    const res = await fetch("/api/demo/invoice", { method: "DELETE" });
    const body = (await res.json().catch(() => ({}))) as { error?: string; deleted?: boolean };
    if (res.ok) {
      setMsg("Permitido: fatura apagada (demo).");
    } else {
      setMsg(`Negado (${res.status}): ${body.error ?? "erro"}`);
    }
  }

  return (
    <div>
      <button type="button" onClick={() => void run()}>
        Tentar ação: apagar fatura (só admin)
      </button>
      {msg ? <p style={{ marginTop: "0.5rem" }}>{msg}</p> : null}
    </div>
  );
}
