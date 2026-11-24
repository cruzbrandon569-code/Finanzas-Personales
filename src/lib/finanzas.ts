// Tipos y catálogo base, tomados de la hoja "Presupuesto Mensual" del Excel.

export type Grupo =
  | "ingresos"
  | "esenciales"
  | "deudas_emergencia"
  | "estilo_vida"
  | "ahorro_inversion";

export type Tipo = "ingreso" | "gasto";

export type Categoria = {
  id: string;
  grupo: Grupo;
  nombre: string;
  proyectado: number;
  sinonimos: string[];
  orden: number;
  activo: boolean;
};

export type Movimiento = {
  id: string;
  fecha: string; // YYYY-MM-DD
  tipo: Tipo;
  categoria_id: string;
  monto: number;
  descripcion: string | null;
  texto_original: string | null;
  created_at: string;
};

// Lo que devuelve el intérprete (IA o reglas) antes de guardar
export type Propuesta = {
  tipo: Tipo;
  categoria_id: string;
  monto: number;
  fecha: string;
  descripcion: string;
  fuente: "ia" | "reglas";
};

export const GRUPOS: { id: Grupo; nombre: string; meta: number | null }[] = [
  { id: "ingresos", nombre: "Ingresos", meta: null },
  { id: "esenciales", nombre: "Gastos fijos / esenciales", meta: 0.65 },
  { id: "deudas_emergencia", nombre: "Deudas y fondo de emergencia", meta: 0.15 },
  { id: "estilo_vida", nombre: "Estilo de vida", meta: 0.1 },
  { id: "ahorro_inversion", nombre: "Ahorro e inversión", meta: 0.1 },
];

export const tipoDeGrupo = (g: Grupo): Tipo => (g === "ingresos" ? "ingreso" : "gasto");

export const CATEGORIAS_INICIALES: Omit<Categoria, "id" | "activo">[] = [
  { grupo: "ingresos", nombre: "Sueldo / Nómina", proyectado: 16000, sinonimos: ["salario", "sueldo", "nomina", "quincena", "pago de trabajo"], orden: 1 },
  { grupo: "ingresos", nombre: "Ventas / Honorarios", proyectado: 3000, sinonimos: ["venta", "ventas", "honorarios", "freelance", "proyecto", "cliente"], orden: 2 },
  { grupo: "ingresos", nombre: "Bonos / Ocasionales", proyectado: 1000, sinonimos: ["bono", "aguinaldo", "regalo", "reembolso", "extra"], orden: 3 },

  { grupo: "esenciales", nombre: "Renta / Vivienda", proyectado: 5500, sinonimos: ["renta", "alquiler", "mantenimiento", "hipoteca", "casa"], orden: 10 },
  { grupo: "esenciales", nombre: "Supermercado", proyectado: 4200, sinonimos: ["super", "supermercado", "despensa", "mandado", "walmart", "soriana", "costco", "oxxo", "mercado", "comida"], orden: 11 },
  { grupo: "esenciales", nombre: "Servicios", proyectado: 1500, sinonimos: ["luz", "agua", "gas", "internet", "telefono", "celular", "cfe", "telmex", "izzi"], orden: 12 },
  { grupo: "esenciales", nombre: "Transporte", proyectado: 1500, sinonimos: ["gasolina", "uber", "didi", "pasaje", "metro", "camion", "transporte", "estacionamiento", "caseta"], orden: 13 },
  { grupo: "esenciales", nombre: "Salud", proyectado: 300, sinonimos: ["salud", "medicina", "medicamento", "farmacia", "doctor", "consulta", "seguro medico"], orden: 14 },

  { grupo: "deudas_emergencia", nombre: "Pago de deudas", proyectado: 1800, sinonimos: ["deuda", "tarjeta", "abono", "prestamo", "credito", "mensualidad"], orden: 20 },
  { grupo: "deudas_emergencia", nombre: "Fondo de emergencia", proyectado: 1200, sinonimos: ["fondo de emergencia", "emergencia", "colchon", "cetes"], orden: 21 },

  { grupo: "estilo_vida", nombre: "Salidas y restaurantes", proyectado: 1200, sinonimos: ["restaurante", "salida", "cena", "comida fuera", "tacos", "cafe", "bar", "cine", "antojo"], orden: 30 },
  { grupo: "estilo_vida", nombre: "Plataformas y entretenimiento", proyectado: 400, sinonimos: ["netflix", "spotify", "disney", "suscripcion", "juego", "streaming", "youtube"], orden: 31 },
  { grupo: "estilo_vida", nombre: "Cuidado personal y compras", proyectado: 400, sinonimos: ["ropa", "zapatos", "corte", "peluqueria", "amazon", "mercado libre", "compras"], orden: 32 },

  { grupo: "ahorro_inversion", nombre: "Capacitación", proyectado: 1000, sinonimos: ["curso", "capacitacion", "libro", "clase", "certificacion"], orden: 40 },
  { grupo: "ahorro_inversion", nombre: "Inversión (ETF / indexado)", proyectado: 1000, sinonimos: ["inversion", "etf", "gbm", "acciones", "ahorro", "invertir"], orden: 41 },
];

export const mxn = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 }).format(n);

// Fecha de hoy en horario de la Ciudad de México (YYYY-MM-DD)
export const hoyMX = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());

export const mesActual = () => hoyMX().slice(0, 7); // YYYY-MM

export const rangoMes = (mes: string) => {
  const [y, m] = mes.split("-").map(Number);
  const fin = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  return { desde: `${mes}-01`, hasta: fin }; // [desde, hasta)
};

export const nombreMes = (mes: string) => {
  const [y, m] = mes.split("-").map(Number);
  const s = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 15)),
  );
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const moverMes = (mes: string, delta: number) => {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
};
