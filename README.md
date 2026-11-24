# Mis Finanzas

App web para registrar finanzas personales por voz desde Android, basada en `plan-financiero-mexico.xlsx`.

- **Registrar**: botón de micrófono → dices "Ingreso, salario, 14,000" → la app propone tipo, categoría, monto y fecha → confirmas con **Guardar**.
- **Movimientos**: historial por mes, filtros y borrado.
- **Presupuesto**: proyectado contra real por categoría, con la regla 65/15/10/10 y el balance a cero de tu Excel.

Stack: Next.js (Vercel) + Supabase (Postgres + login) + API de Claude (interpretación de la frase).

## Configuración

1. **Supabase**: crea un proyecto, abre *SQL Editor* y ejecuta `supabase/schema.sql`.
2. **Variables**: copia `.env.example` como `.env.local` y llénalo.
3. **Local**: `npm install` y luego `npm run dev`; abre http://localhost:3000.
4. **Vercel**: importa el repo de GitHub y agrega las mismas variables de entorno.
5. **Primera vez**: crea tu cuenta en `/login`. Después, en Supabase, ve a *Authentication > Sign In / Providers* y desactiva **Allow new users to sign up**, para que nadie más pueda registrarse.
6. **En el teléfono**: abre la URL en Chrome, menú ⋮ → **Agregar a pantalla principal**.

## Cómo se interpreta la voz

`src/app/api/interpretar/route.ts` manda la frase y tu catálogo de categorías a Claude con salida estructurada, así que la categoría siempre es una válida. Si no hay `ANTHROPIC_API_KEY` o la IA falla, se usa `src/lib/reglas.ts`, que entiende el formato "tipo, concepto, monto". Los sinónimos de cada categoría están en `src/lib/finanzas.ts`.
