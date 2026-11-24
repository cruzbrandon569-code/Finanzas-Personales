// Intérprete sin IA: funciona con frases tipo "Ingreso, salario, $14,000"
// o "gasto súper 850". Se usa como respaldo si la IA no está disponible.
import { Categoria, Propuesta, Tipo, hoyMX, tipoDeGrupo } from "./finanzas";

export const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

const PALABRAS_INGRESO = ["ingreso", "ingresos", "cobre", "me pagaron", "recibi", "me depositaron", "entrada", "gane"];
const PALABRAS_GASTO = ["gasto", "gastos", "gaste", "pague", "compre", "salida de dinero", "egreso"];

const NUMEROS: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, cien: 100,
};

export function extraerMonto(texto: string): number | null {
  const t = normalizar(texto);

  // "14 mil", "14.5 mil", "dos mil"
  const mil = t.match(/(\d+(?:[.,]\d+)?|[a-z]+)\s*mil\b(?:\s+(\d+))?/);
  if (mil) {
    const base = /\d/.test(mil[1]) ? parseFloat(mil[1].replace(",", ".")) : NUMEROS[mil[1]] ?? 1;
    const resto = mil[2] ? parseInt(mil[2], 10) : 0;
    return base * 1000 + resto;
  }

  // "$14,000.50", "14000", "1,250", "350.5"
  const m = t.match(/\$?\s*(\d{1,3}(?:[,\s]\d{3})+(?:\.\d{1,2})?|\d+(?:[.,]\d{1,2})?)/);
  if (!m) return null;
  let n = m[1].replace(/\s/g, "");
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(n)) n = n.replace(/,/g, "");
  else n = n.replace(",", ".");
  const v = parseFloat(n);
  return Number.isFinite(v) && v > 0 ? v : null;
}

function detectarTipo(t: string): Tipo | null {
  if (PALABRAS_INGRESO.some((p) => t.includes(p))) return "ingreso";
  if (PALABRAS_GASTO.some((p) => t.includes(p))) return "gasto";
  return null;
}

function detectarFecha(t: string): string {
  const hoy = hoyMX();
  if (/\bantier\b|\bantes de ayer\b/.test(t)) return restarDias(hoy, 2);
  if (/\bayer\b/.test(t)) return restarDias(hoy, 1);
  return hoy;
}

function restarDias(fecha: string, dias: number) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

export function interpretarConReglas(texto: string, categorias: Categoria[]): Propuesta | null {
  const t = normalizar(texto);
  const monto = extraerMonto(texto);
  if (!monto) return null;

  let tipo = detectarTipo(t);

  // Buscar la categoría cuyo nombre o sinónimo aparezca en el texto (el término más largo gana)
  let mejor: { cat: Categoria; largo: number } | null = null;
  for (const cat of categorias) {
    if (tipo && tipoDeGrupo(cat.grupo) !== tipo) continue;
    const terminos = [cat.nombre, ...cat.sinonimos].map(normalizar);
    for (const term of terminos) {
      const palabras = term.split(/[\s/()]+/).filter((w) => w.length > 2);
      const coincide = t.includes(term) || palabras.some((w) => new RegExp(`\\b${w}\\b`).test(t));
      if (coincide && (!mejor || term.length > mejor.largo)) mejor = { cat, largo: term.length };
    }
  }

  let categoria = mejor?.cat;
  if (!tipo) tipo = categoria ? tipoDeGrupo(categoria.grupo) : "gasto";
  if (!categoria) {
    categoria = categorias.find((c) => tipoDeGrupo(c.grupo) === tipo);
    if (!categoria) return null;
  }

  // Descripción: el texto sin el tipo ni el monto
  const descripcion = texto
    .replace(/\$?\s*\d[\d,.\s]*(mil)?/gi, "")
    .replace(/\b(ingreso|gasto)s?\b/gi, "")
    .replace(/[,.;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    tipo,
    categoria_id: categoria.id,
    monto: Math.round(monto * 100) / 100,
    fecha: detectarFecha(t),
    descripcion: descripcion || categoria.nombre,
    fuente: "reglas",
  };
}
