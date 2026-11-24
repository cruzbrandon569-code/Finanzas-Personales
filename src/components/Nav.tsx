"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Registrar", icon: "🎙️" },
  { href: "/movimientos", label: "Movimientos", icon: "📋" },
  { href: "/presupuesto", label: "Presupuesto", icon: "📊" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-lg grid-cols-3">
        {LINKS.map((l) => {
          const activo = path === l.href;
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs ${activo ? "font-semibold text-brand" : "text-muted"}`}
              >
                <span className="text-xl" aria-hidden>
                  {l.icon}
                </span>
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Pagina({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-28 pt-5">
        <h1 className="text-xl font-semibold">{titulo}</h1>
        {children}
      </main>
      <Nav />
    </>
  );
}
