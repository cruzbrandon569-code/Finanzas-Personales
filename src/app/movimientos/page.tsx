"use client";

import { useCallback, useEffect, useState } from "react";
import { Pagina } from "@/components/Nav";
import { SelectorMes } from "@/components/SelectorMes";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { useCategorias } from "@/lib/useCategorias";
import { Movimiento, mesActual, mxn, rangoMes } from "@/lib/finanzas";

export default function Movimientos() {
  const supabase = crearClienteNavegador();
  const { categorias } = useCategorias();
  const [mes, setMes] = useState(mesActual());
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [filtro, setFiltro] = useState<"todos" | "ingreso" | "gasto">("todos");

  const cargar = useCallback(async () => {
    const { desde, hasta } = rangoMes(mes);
    const { data } = await supabase
      .from("movimientos")
      .select("*")
      .gte("fecha", desde)
      .lt("fecha", hasta)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false });
    setMovs(((data ?? []) as Movimiento[]).map((m) => ({ ...m, monto: Number(m.monto) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function borrar(m: Movimiento) {
    if (!confirm(`¿Borrar "${m.descripcion}" por ${mxn(m.monto)}? No se puede deshacer.`)) return;
    await supabase.from("movimientos").delete().eq("id", m.id);
    cargar();
  }

  const nombreCat = (id: string) => categorias.find((c) => c.id === id)?.nombre ?? "—";
  const visibles = movs.filter((m) => filtro === "todos" || m.tipo === filtro);
  const total = (t: "ingreso" | "gasto") => movs.filter((m) => m.tipo === t).reduce((a, m) => a + m.monto, 0);

  // Agrupar por día
  const porDia = visibles.reduce<Record<string, Movimiento[]>>((acc, m) => {
    (acc[m.fecha] ||= []).push(m);
    return acc;
  }, {});

  return (
    <Pagina titulo="Movimientos">
      <SelectorMes mes={mes} onChange={setMes} />

      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        {(
          [
            ["todos", "Todos", mxn(total("ingreso") - total("gasto"))],
            ["ingreso", "Ingresos", mxn(total("ingreso"))],
            ["gasto", "Gastos", mxn(total("gasto"))],
          ] as const
        ).map(([id, label, v]) => (
          <button
            key={id}
            onClick={() => setFiltro(id)}
            className={`rounded-xl border p-2 ${filtro === id ? "border-brand bg-card" : "border-line"}`}
          >
            <span className="block text-xs text-muted">{label}</span>
            <span className="num font-semibold">{v}</span>
          </button>
        ))}
      </div>

      {visibles.length === 0 && <p className="text-sm text-muted">Sin movimientos en este mes.</p>}

      {Object.entries(porDia).map(([fecha, lista]) => (
        <section key={fecha} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase text-muted">
            {new Date(`${fecha}T12:00:00`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" })}
          </h2>
          {lista.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.descripcion || nombreCat(m.categoria_id)}</p>
                <p className="truncate text-xs text-muted">
                  {nombreCat(m.categoria_id)}
                  {m.texto_original ? ` · “${m.texto_original}”` : ""}
                </p>
              </div>
              <p className={`num shrink-0 font-semibold ${m.tipo === "ingreso" ? "text-ok" : "text-bad"}`}>
                {m.tipo === "ingreso" ? "+" : "−"}
                {mxn(m.monto)}
              </p>
              <button onClick={() => borrar(m)} aria-label="Borrar" className="shrink-0 px-1 text-muted">
                🗑️
              </button>
            </div>
          ))}
        </section>
      ))}
    </Pagina>
  );
}
