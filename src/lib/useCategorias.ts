"use client";

import { useCallback, useEffect, useState } from "react";
import { crearClienteNavegador } from "./supabase/client";
import { CATEGORIAS_INICIALES, Categoria } from "./finanzas";

// Carga las categorías del usuario; la primera vez crea las del Excel.
export function useCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const supabase = crearClienteNavegador();
    let { data } = await supabase.from("categorias").select("*").order("orden");
    if (data && data.length === 0) {
      await supabase.from("categorias").insert(CATEGORIAS_INICIALES);
      ({ data } = await supabase.from("categorias").select("*").order("orden"));
    }
    setCategorias(((data ?? []) as Categoria[]).map((c) => ({ ...c, proyectado: Number(c.proyectado) })));
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { categorias, cargando, recargar: cargar };
}
