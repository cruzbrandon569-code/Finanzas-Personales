"use client";

import { mesActual, moverMes, nombreMes } from "@/lib/finanzas";

export function SelectorMes({ mes, onChange }: { mes: string; onChange: (m: string) => void }) {
  const esActual = mes >= mesActual();
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-card px-2 py-1">
      <button className="px-3 py-2 text-lg" aria-label="Mes anterior" onClick={() => onChange(moverMes(mes, -1))}>
        ‹
      </button>
      <span className="font-medium">{nombreMes(mes)}</span>
      <button
        className="px-3 py-2 text-lg disabled:opacity-30"
        aria-label="Mes siguiente"
        disabled={esActual}
        onClick={() => onChange(moverMes(mes, 1))}
      >
        ›
      </button>
    </div>
  );
}
