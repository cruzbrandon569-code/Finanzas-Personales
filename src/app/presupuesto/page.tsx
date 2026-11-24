"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pagina } from "@/components/Nav";
import { SelectorMes } from "@/components/SelectorMes";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { useCategorias } from "@/lib/useCategorias";
import { GRUPOS, mesActual, mxn, rangoMes } from "@/lib/finanzas";

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default function Presupuesto() {
  const supabase = crearClienteNavegador();
  const router = useRouter();
  const { categorias, recargar } = useCategorias();
  const [mes, setMes] = useState(mesActual());
  const [real, setReal] = useState<Record<string, number>>({});
  const [editando, setEditando] = useState(false);

  const cargar = useCallback(async () => {
    const { desde, hasta } = rangoMes(mes);
    const { data } = await supabase
      .from("movimientos")
      .select("categoria_id, monto")
      .gte("fecha", desde)
      .lt("fecha", hasta);
    const suma: Record<string, number> = {};
    for (const m of data ?? []) suma[m.categoria_id] = (suma[m.categoria_id] ?? 0) + Number(m.monto);
    setReal(suma);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function cambiarProyectado(id: string, valor: number) {
    await supabase.from("categorias").update({ proyectado: valor }).eq("id", id);
    recargar();
  }

  async function salir() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const totalGrupo = (g: string, campo: "proyectado" | "real") =>
    categorias
      .filter((c) => c.grupo === g)
      .reduce((a, c) => a + (campo === "proyectado" ? c.proyectado : real[c.id] ?? 0), 0);

  const ingresoReal = totalGrupo("ingresos", "real");
  const ingresoProy = totalGrupo("ingresos", "proyectado");
  const egresosReal = GRUPOS.filter((g) => g.id !== "ingresos").reduce((a, g) => a + totalGrupo(g.id, "real"), 0);
  const egresosProy = GRUPOS.filter((g) => g.id !== "ingresos").reduce((a, g) => a + totalGrupo(g.id, "proyectado"), 0);

  return (
    <Pagina titulo="Presupuesto">
      <SelectorMes mes={mes} onChange={setMes} />

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-card p-3">
          <p className="text-xs text-muted">Balance real (objetivo $0)</p>
          <p className={`num text-lg font-semibold ${ingresoReal - egresosReal >= 0 ? "text-ok" : "text-bad"}`}>
            {mxn(ingresoReal - egresosReal)}
          </p>
          <p className="text-xs text-muted">sin asignar del ingreso</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-3">
          <p className="text-xs text-muted">Balance proyectado</p>
          <p className="num text-lg font-semibold">{mxn(ingresoProy - egresosProy)}</p>
          <p className="text-xs text-muted">ingreso − asignado</p>
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={() => setEditando(!editando)} className="text-sm text-brand underline">
          {editando ? "Listo" : "Editar montos proyectados"}
        </button>
      </div>

      {GRUPOS.map((g) => {
        const cats = categorias.filter((c) => c.grupo === g.id);
        const tReal = totalGrupo(g.id, "real");
        const tProy = totalGrupo(g.id, "proyectado");
        const esIngreso = g.id === "ingresos";
        const porcentaje = ingresoReal > 0 ? tReal / ingresoReal : 0;
        const pasado = g.meta !== null && ingresoReal > 0 && porcentaje > g.meta;
        return (
          <section key={g.id} className="overflow-hidden rounded-2xl border border-line bg-card">
            <header className="flex items-baseline justify-between gap-2 border-b border-line px-3 py-2">
              <h2 className="text-sm font-semibold">{g.nombre}</h2>
              {g.meta !== null && (
                <span className={`num text-xs ${pasado ? "text-bad" : "text-muted"}`}>
                  {pct(porcentaje)} del ingreso · meta {pct(g.meta)}
                </span>
              )}
            </header>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="px-3 py-1 text-left font-normal">Concepto</th>
                  <th className="px-1 py-1 text-right font-normal">Proy.</th>
                  <th className="px-1 py-1 text-right font-normal">Real</th>
                  <th className="px-3 py-1 text-right font-normal">Dif.</th>
                </tr>
              </thead>
              <tbody>
                {cats.map((c) => {
                  const r = real[c.id] ?? 0;
                  const dif = esIngreso ? r - c.proyectado : c.proyectado - r;
                  return (
                    <tr key={c.id} className="border-t border-line">
                      <td className="px-3 py-2">{c.nombre}</td>
                      <td className="num px-1 py-2 text-right text-muted">
                        {editando ? (
                          <input
                            type="number"
                            inputMode="decimal"
                            defaultValue={c.proyectado}
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (v !== c.proyectado && v >= 0) cambiarProyectado(c.id, v);
                            }}
                            className="num w-24 px-2 py-1 text-right text-sm"
                          />
                        ) : (
                          mxn(c.proyectado)
                        )}
                      </td>
                      <td className="num px-1 py-2 text-right">{mxn(r)}</td>
                      <td className={`num px-3 py-2 text-right ${dif < 0 ? "text-bad" : "text-ok"}`}>{mxn(dif)}</td>
                    </tr>
                  );
                })}
                <tr className="border-t border-line font-semibold">
                  <td className="px-3 py-2">Total</td>
                  <td className="num px-1 py-2 text-right">{mxn(tProy)}</td>
                  <td className="num px-1 py-2 text-right">{mxn(tReal)}</td>
                  <td className="num px-3 py-2 text-right">{mxn(esIngreso ? tReal - tProy : tProy - tReal)}</td>
                </tr>
              </tbody>
            </table>
          </section>
        );
      })}

      <p className="text-xs text-muted">
        Diferencia positiva (verde): en ingresos, ganaste más de lo proyectado; en gastos, gastaste menos de lo
        presupuestado.
      </p>

      <button onClick={salir} className="mt-4 rounded-xl border border-line py-2 text-sm text-muted">
        Cerrar sesión
      </button>
    </Pagina>
  );
}
