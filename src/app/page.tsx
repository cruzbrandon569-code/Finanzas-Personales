"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pagina } from "@/components/Nav";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { useCategorias } from "@/lib/useCategorias";
import { GRUPOS, Movimiento, Propuesta, hoyMX, mesActual, mxn, rangoMes, tipoDeGrupo } from "@/lib/finanzas";

// Tipos mínimos de la Web Speech API (Chrome en Android)
type Reconocimiento = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
declare global {
  interface Window {
    SpeechRecognition?: new () => Reconocimiento;
    webkitSpeechRecognition?: new () => Reconocimiento;
  }
}

export default function Registrar() {
  const supabase = crearClienteNavegador();
  const { categorias, cargando } = useCategorias();
  const [texto, setTexto] = useState("");
  const [escuchando, setEscuchando] = useState(false);
  const [interpretando, setInterpretando] = useState(false);
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [recientes, setRecientes] = useState<Movimiento[]>([]);
  const [resumen, setResumen] = useState({ ingresos: 0, gastos: 0 });
  const [hayVoz, setHayVoz] = useState(false);
  const rec = useRef<Reconocimiento | null>(null);

  const cargarRecientes = useCallback(async () => {
    const { desde, hasta } = rangoMes(mesActual());
    const { data } = await supabase
      .from("movimientos")
      .select("*")
      .gte("fecha", desde)
      .lt("fecha", hasta)
      .order("created_at", { ascending: false });
    const movs = ((data ?? []) as Movimiento[]).map((m) => ({ ...m, monto: Number(m.monto) }));
    setRecientes(movs.slice(0, 5));
    setResumen({
      ingresos: movs.filter((m) => m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0),
      gastos: movs.filter((m) => m.tipo === "gasto").reduce((a, m) => a + m.monto, 0),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setHayVoz(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    cargarRecientes();
  }, [cargarRecientes]);

  async function interpretar(frase: string) {
    if (!frase.trim()) return;
    setInterpretando(true);
    setError(null);
    setAviso(null);
    setPropuesta(null);
    try {
      const r = await fetch("/api/interpretar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: frase }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Error al interpretar");
      setPropuesta(j.propuesta);
      if (j.aviso) setAviso(j.aviso);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setInterpretando(false);
    }
  }

  function hablar() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (escuchando) return rec.current?.stop();
    const r = new SR();
    r.lang = "es-MX";
    r.interimResults = true;
    r.continuous = false;
    let final = "";
    r.onresult = (e) => {
      let parcial = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) final = res[0].transcript;
        else parcial += res[0].transcript;
      }
      setTexto(final || parcial);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed") setError("Permite el micrófono para este sitio en Chrome.");
      else if (e.error !== "no-speech" && e.error !== "aborted") setError(`Micrófono: ${e.error}`);
    };
    r.onend = () => {
      setEscuchando(false);
      if (final) interpretar(final);
    };
    rec.current = r;
    setTexto("");
    setPropuesta(null);
    setError(null);
    setEscuchando(true);
    r.start();
  }

  async function guardar() {
    if (!propuesta) return;
    const { error } = await supabase.from("movimientos").insert({
      fecha: propuesta.fecha,
      tipo: propuesta.tipo,
      categoria_id: propuesta.categoria_id,
      monto: propuesta.monto,
      descripcion: propuesta.descripcion,
      texto_original: texto || null,
    });
    if (error) return setError(error.message);
    setPropuesta(null);
    setTexto("");
    setAviso("✔️ Movimiento guardado");
    cargarRecientes();
  }

  const nombreCat = (id: string) => categorias.find((c) => c.id === id)?.nombre ?? "—";
  const catsDelTipo = categorias.filter((c) => propuesta && tipoDeGrupo(c.grupo) === propuesta.tipo);

  return (
    <Pagina titulo="Registrar">
      <section className="grid grid-cols-2 gap-3">
        <Tarjeta etiqueta="Ingresos del mes" valor={mxn(resumen.ingresos)} clase="text-ok" />
        <Tarjeta etiqueta="Gastos del mes" valor={mxn(resumen.gastos)} clase="text-bad" />
      </section>

      <section className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-card p-5">
        {hayVoz ? (
          <button
            onClick={hablar}
            disabled={cargando || interpretando}
            aria-label={escuchando ? "Detener" : "Dictar movimiento"}
            className={`flex h-28 w-28 items-center justify-center rounded-full text-5xl shadow-lg transition disabled:opacity-50 ${
              escuchando ? "animate-pulse bg-bad text-white" : "bg-brand text-brand-fg"
            }`}
          >
            {escuchando ? "■" : "🎙️"}
          </button>
        ) : (
          <p className="text-center text-sm text-muted">
            Este navegador no tiene reconocimiento de voz. Usa el micrófono del teclado en el campo de abajo.
          </p>
        )}
        <p className="text-center text-sm text-muted">
          {escuchando ? "Te escucho…" : "Ej.: “Ingreso, salario, 14,000” o “Gasté 350 en gasolina”"}
        </p>
        <form
          className="flex w-full gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            interpretar(texto);
          }}
        >
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="O escribe / dicta aquí"
            enterKeyHint="send"
          />
          <button
            disabled={!texto.trim() || interpretando}
            className="shrink-0 rounded-xl bg-brand px-4 font-medium text-brand-fg disabled:opacity-50"
          >
            {interpretando ? "…" : "Ir"}
          </button>
        </form>
        {interpretando && <p className="text-sm text-muted">Interpretando…</p>}
        {error && <p className="text-sm text-bad">{error}</p>}
        {aviso && !propuesta && <p className="text-sm text-ok">{aviso}</p>}
      </section>

      {propuesta && (
        <section className="flex flex-col gap-3 rounded-2xl border-2 border-brand bg-card p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">¿Lo guardo así?</h2>
            <span className="text-xs text-muted">{propuesta.fuente === "ia" ? "Interpretado con IA" : "Interpretado con reglas"}</span>
          </div>
          {aviso && <p className="text-xs text-muted">{aviso}</p>}
          <div className="grid grid-cols-2 gap-2">
            {(["ingreso", "gasto"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  const primera = categorias.find((c) => tipoDeGrupo(c.grupo) === t);
                  setPropuesta({ ...propuesta, tipo: t, categoria_id: primera?.id ?? propuesta.categoria_id });
                }}
                className={`rounded-xl border py-2 text-sm font-medium ${
                  propuesta.tipo === t ? (t === "ingreso" ? "border-ok bg-ok/10 text-ok" : "border-bad bg-bad/10 text-bad") : "border-line text-muted"
                }`}
              >
                {t === "ingreso" ? "Ingreso" : "Gasto"}
              </button>
            ))}
          </div>
          <label className="text-sm">
            Monto
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={propuesta.monto}
              onChange={(e) => setPropuesta({ ...propuesta, monto: Number(e.target.value) })}
              className="num text-lg font-semibold"
            />
          </label>
          <label className="text-sm">
            Categoría
            <select
              value={propuesta.categoria_id}
              onChange={(e) => setPropuesta({ ...propuesta, categoria_id: e.target.value })}
            >
              {GRUPOS.filter((g) => tipoDeGrupo(g.id) === propuesta.tipo).map((g) => (
                <optgroup key={g.id} label={g.nombre}>
                  {catsDelTipo
                    .filter((c) => c.grupo === g.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">
              Fecha
              <input
                type="date"
                value={propuesta.fecha}
                max={hoyMX()}
                onChange={(e) => setPropuesta({ ...propuesta, fecha: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Descripción
              <input
                value={propuesta.descripcion}
                onChange={(e) => setPropuesta({ ...propuesta, descripcion: e.target.value })}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setPropuesta(null)} className="rounded-xl border border-line py-3 text-muted">
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={!(propuesta.monto > 0)}
              className="rounded-xl bg-brand py-3 font-semibold text-brand-fg disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">Últimos movimientos</h2>
        {recientes.length === 0 && <p className="text-sm text-muted">Aún no hay movimientos este mes.</p>}
        {recientes.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-xl border border-line bg-card px-3 py-2">
            <div>
              <p className="text-sm font-medium">{m.descripcion || nombreCat(m.categoria_id)}</p>
              <p className="text-xs text-muted">
                {nombreCat(m.categoria_id)} · {m.fecha}
              </p>
            </div>
            <p className={`num font-semibold ${m.tipo === "ingreso" ? "text-ok" : "text-bad"}`}>
              {m.tipo === "ingreso" ? "+" : "−"}
              {mxn(m.monto)}
            </p>
          </div>
        ))}
      </section>
    </Pagina>
  );
}

function Tarjeta({ etiqueta, valor, clase }: { etiqueta: string; valor: string; clase: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3">
      <p className="text-xs text-muted">{etiqueta}</p>
      <p className={`num text-lg font-semibold ${clase}`}>{valor}</p>
    </div>
  );
}
