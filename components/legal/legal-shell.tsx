import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

type LegalShellProps = {
  title: string;
  updatedAt: string;
  children: ReactNode;
};

const SUPPORT_EMAIL = "servizioclienti@grooming-revolution.com";

export function LegalShell({ title, updatedAt, children }: LegalShellProps) {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <header className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="inline-flex h-16 w-full max-w-[320px] items-center rounded-lg border border-rose-300 bg-rose-50 p-2">
              <Image
                src="/img/logo-grooming-revolution.png"
                alt="Grooming Revolution"
                width={640}
                height={180}
                className="h-full w-full object-contain"
                priority
              />
            </Link>
            <Link href="/" className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100">
              Torna alla Home
            </Link>
          </div>
          <div className="mt-4 border-t border-zinc-200 pt-4">
            <p className="text-lg font-bold text-zinc-900">{title}</p>
            <p className="text-sm text-zinc-600">Ultimo aggiornamento: {updatedAt}</p>
            <p className="mt-2 text-sm text-zinc-700">
              Grooming Revolution e il brand del servizio SaaS sviluppato, gestito e commercializzato da
              Cecilia Luxury Grooming.
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-7">{children}</section>

        <footer className="rounded-2xl border border-zinc-200 bg-zinc-950 p-5 text-zinc-200 shadow-sm md:p-6">
          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <p className="text-sm font-semibold">Cecilia Luxury Grooming</p>
              <p className="mt-1 text-xs text-zinc-400">Sede legale: Via Ernesto Bosia 4, 6900 Paradiso (CH)</p>
              <p className="text-xs text-zinc-400">Titolare del servizio SaaS Grooming Revolution</p>
            </div>
            <div>
              <p className="text-sm font-semibold">Contatti servizio clienti</p>
              <p className="mt-1 text-xs text-zinc-300">Email: {SUPPORT_EMAIL}</p>
              <p className="text-xs text-zinc-500">Assistenza commerciale e tecnica</p>
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <p className="text-sm font-semibold text-zinc-200">Link legali</p>
              <Link href="/privacy-policy" className="text-zinc-300 hover:text-white">Privacy Policy</Link>
              <Link href="/terms-and-conditions" className="text-zinc-300 hover:text-white">Termini di Servizio</Link>
              <Link href="/dpa" className="text-zinc-300 hover:text-white">Data Processing Agreement (DPA)</Link>
              <Link href="/refund-policy" className="text-zinc-300 hover:text-white">Politica di rimborso</Link>
              <Link href="/legal/cookies" className="text-zinc-300 hover:text-white">Cookie Policy</Link>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
            <p className="text-xs text-zinc-500">© {new Date().getFullYear()} Grooming Revolution. Diritti riservati a Cecilia Luxury Grooming.</p>
            <Link href="/" className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-900">
              Torna alla Home
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}


