import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Image from "next/image";

const highlights = [
  "Agenda smart con reminder WhatsApp",
  "Clienti, cani e storico trattamenti in un unico posto",
  "Incassi, mancia e KPI per decisioni veloci",
  "Multi-sede con gestione separata dei dati",
];

const reasons = [
  {
    title: "Perche nasce",
    text: "Grooming Revolution nasce per eliminare caos, fogli sparsi e perdite di tempo nella gestione quotidiana del salone.",
  },
  {
    title: "Cosa risolve",
    text: "Riduce no-show, velocizza la gestione appuntamenti e rende immediato il controllo economico della tua attivita.",
  },
  {
    title: "Perche usarlo",
    text: "Hai un sistema semplice ma professionale, pensato per toelettatori, con dati chiari e automazioni utili davvero.",
  },
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-amber-200/70 bg-white/85 p-6 shadow-sm backdrop-blur md:p-10">
          <div className="h-16 w-full max-w-[340px] overflow-hidden rounded-lg bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 p-1">
            <Image
              src="/img/logo-grooming-revolution.png"
              alt="Grooming Revolution"
              width={640}
              height={180}
              className="h-full w-full origin-left object-contain object-left scale-[3]"
              priority
            />
          </div>
          <p className="inline-flex rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold tracking-wide text-white">
            SaaS per toelettatura professionale
          </p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-900 md:text-5xl">
            Grooming Revolution
          </h1>
          <p className="mt-3 max-w-3xl text-base text-zinc-700 md:text-lg">
            Il gestionale che ti aiuta a lavorare meglio ogni giorno: meno no-show, agenda ordinata, clienti seguiti meglio e controllo reale su incassi e performance.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-amber-400"
            >
              Inizia gratis
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
            >
              Accedi
            </Link>
          </div>
          <p className="mt-3 text-sm text-zinc-600">
            Trial fino a 100 clienti. Poi piano FULL: 20 EUR/mese + IVA con addebito automatico.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {highlights.map((item) => (
            <article key={item} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-zinc-800">{item}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {reasons.map((item) => (
            <article key={item.title} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-zinc-900">{item.title}</h2>
              <p className="mt-2 text-sm text-zinc-700">{item.text}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-zinc-900 p-6 text-zinc-100 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold">Pronto a semplificare il tuo salone?</h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-200">
            Registrati in pochi minuti, configura sede/paese/valuta e inizia subito a gestire appuntamenti, clienti e contabilita in modo professionale.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-amber-300"
            >
              Crea account
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-zinc-600 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-800"
            >
              Ho gia un account
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

