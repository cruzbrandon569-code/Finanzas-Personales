import type { MetadataRoute } from "next";

// Permite "Agregar a pantalla de inicio" en Android y abrirla como app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mis Finanzas",
    short_name: "Finanzas",
    description: "Registro de finanzas personales por voz",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f9",
    theme_color: "#0f766e",
    lang: "es-MX",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
