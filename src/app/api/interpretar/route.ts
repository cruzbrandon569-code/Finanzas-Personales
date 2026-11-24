import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";
import { Categoria, Propuesta, hoyMX } from "@/lib/finanzas";
import { interpretarConReglas } from "@/lib/reglas";

// Modelo configurable desde Vercel (variable CLAUDE_MODEL).
const MODELO = process.env.CLAUDE_MODEL || "claude-opus-5-5";

export async function POST(req: Request) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { texto } = (await req.json()) as { texto?: string };
  if (!texto?.trim()) return NextResponse.json({ error: "Texto vacío" }, { status: 400 });

  const { data: cats } = await supabase
    .from("categorias")
    .select("*")
    .eq("activo", true)
    .order("orden");
  const categorias = (cats ?? []) as Categoria[];
  if (!categorias.length) return NextResponse.json({ error: "No hay categorías" }, { status: 400 });

  let propuesta: Propuesta | null = null;
  let aviso: string | undefined;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      propuesta = await interpretarConClaude(texto, categorias);
    } catch (e) {
      console.error("Error con Claude, usando reglas:", e);
      aviso = "La IA no respondió; se interpretó con reglas básicas.";
    }
  }
  if (!propuesta) propuesta = interpretarConReglas(texto, categorias);

  if (!propuesta) {
    return NextResponse.json(
      { error: "No entendí el monto. Intenta algo como: “Gasto, súper, 850”." },
      { status: 422 },
    );
  }
  return NextResponse.json({ propuesta, aviso });
}

async function interpretarConClaude(texto: string, categorias: Categoria[]): Promise<Propuesta | null> {
  const client = new Anthropic();
  const ids = categorias.map((c) => c.id) as [string, ...string[]];

  const Esquema = z.object({
    tipo: z.enum(["ingreso", "gasto"]),
    categoria_id: z.enum(ids),
    monto: z.number(),
    fecha: z.string().describe("YYYY-MM-DD"),
    descripcion: z.string().describe("Descripción breve en español, máximo 60 caracteres"),
  });

  const catalogo = categorias
    .map((c) => `- id=${c.id} | grupo=${c.grupo} | ${c.nombre} | sinónimos: ${c.sinonimos.join(", ")}`)
    .join("\n");

  // Instrucciones estables primero (se pueden cachear); el texto variable va en el mensaje.
  const system = `Eres el intérprete de una app de finanzas personales en México (pesos MXN).
Recibes una frase dictada por voz desde un teléfono y la conviertes en UN movimiento.

Reglas:
- tipo: "ingreso" si entra dinero (salario, venta, me pagaron, me depositaron); si no, "gasto".
- categoria_id: elige el id más adecuado del catálogo. Los ingresos solo van en grupo "ingresos"; los gastos en cualquier otro grupo. Ejemplos: Uber → Transporte; Netflix → Plataformas; abono a tarjeta → Pago de deudas.
- monto: número positivo en pesos. El dictado puede escribir "14,000", "14 mil", "catorce mil" o "$14,000.00"; todos son 14000.
- fecha: hoy es ${hoyMX()}. "Ayer", "el lunes", "el 3 de noviembre" se convierten a YYYY-MM-DD. Si no se menciona, usa hoy.
- descripcion: corta y útil, por ejemplo "Quincena", "Súper Walmart", "Gasolina".

Catálogo de categorías:
${catalogo}`;

  const response = await client.messages.parse({
    model: MODELO,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(Esquema) },
    system,
    messages: [{ role: "user", content: texto }],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) return null;
  const r = response.parsed_output;
  if (!(r.monto > 0)) return null;
  return {
    ...r,
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(r.fecha) ? r.fecha : hoyMX(),
    monto: Math.round(r.monto * 100) / 100,
    fuente: "ia",
  };
}
