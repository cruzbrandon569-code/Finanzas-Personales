"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/client";

export default function Login() {
  const supabase = crearClienteNavegador();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modo, setModo] = useState<"entrar" | "registrar">("entrar");
  const [msg, setMsg] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setMsg(null);
    const { data, error } =
      modo === "entrar"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setCargando(false);
    if (error) return setMsg(error.message);
    if (modo === "registrar" && !data.session) {
      return setMsg("Cuenta creada. Revisa tu correo para confirmarla y luego entra.");
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">Mis Finanzas</h1>
        <p className="text-sm text-muted">Registra tus movimientos con la voz.</p>
      </div>
      <form onSubmit={enviar} className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
        <label className="text-sm">
          Correo
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="text-sm">
          Contraseña
          <input
            type="password"
            required
            minLength={8}
            autoComplete={modo === "entrar" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button
          disabled={cargando}
          className="mt-1 rounded-xl bg-brand py-3 font-medium text-brand-fg disabled:opacity-60"
        >
          {cargando ? "…" : modo === "entrar" ? "Entrar" : "Crear cuenta"}
        </button>
        {msg && <p className="text-sm text-bad">{msg}</p>}
      </form>
      <button
        className="text-sm text-muted underline"
        onClick={() => setModo(modo === "entrar" ? "registrar" : "entrar")}
      >
        {modo === "entrar" ? "¿Primera vez? Crear cuenta" : "Ya tengo cuenta"}
      </button>
    </main>
  );
}
