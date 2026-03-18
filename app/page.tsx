import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Image from "next/image";

const keyPoints = [
  "Agenda multi-operatore e multi-sede con gestione semplice",
  "Clienti, cani, trattamenti e storico in un unico flusso",
  "No-show sotto controllo con reminder e conferma rapida",
  "Contabilita e KPI per prendere decisioni in tempo reale",
  "Listino intelligente con durata e prezzo automatici",
  "Interfaccia veloce da mobile, tablet e desktop",
];

const testimonials = [
  {
    name: "Cecilia, owner salon",
    text: "Prima usavamo fogli e chat sparse. Ora l agenda e ordinata, il team lavora meglio e i no-show sono finalmente tracciati.",
    result: "-38% no-show in 8 settimane",
  },
  {
    name: "Marco, grooming manager",
    text: "La parte migliore e il controllo: vedo subito chi lavora, incassi per sede e performance operatori senza export infiniti.",
    result: "+3h risparmiate a settimana",
  },
  {
    name: "Alessio, multi-sede",
    text: "Con due sedi serviva un sistema serio ma semplice. Qui cambio sede in un click e i dati restano separati in modo pulito.",
    result: "2 sedi, 1 workflow unico",
  },
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10 xl:px-12">
      <div className="mx-auto max-w-[1320px] space-y-6">
        <section className="rounded-3xl border border-zinc-200 bg-white/90 p-5 shadow-sm md:p-8 xl:p-10">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="h-16 w-full max-w-[360px] overflow-hidden rounded-lg border border-rose-300 bg-gradient-to-r from-rose-100 via-rose-100 to-pink-200 p-1">
                <Image
                  src="/img/logo-grooming-revolution.png"
                  alt="Grooming Revolution"
                  width={640}
                  height={180}
                  className="h-full w-full origin-center object-contain object-center scale-[2.85] translate-y-[12px]"
                  priority
                />
              </div>
              <p className="mt-3 inline-flex rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold tracking-wide text-white">
                SaaS gestionale per toelettatura professionale
              </p>
              <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-zinc-900 md:text-5xl xl:text-6xl">
                Il gestionale top per saloni grooming che vogliono crescere davvero
              </h1>
              <p className="mt-4 max-w-3xl text-base text-zinc-700 md:text-lg">
                Organizza agenda, operatori, sedi, clienti, cani, incassi e report in un unico sistema. Niente caos, niente perdite di tempo, piu controllo operativo ogni giorno.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-amber-400"
                >
                  Provalo gratis
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
                >
                  Ho gia un account
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-5 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-zinc-600">Prezzo chiaro e fisso</p>
              <p className="mt-2 text-3xl font-black text-zinc-900">Gratis fino a 100 clienti</p>
              <p className="mt-2 text-sm text-zinc-700">Quando superi 100 clienti: piano FULL a costo basso e fisso.</p>
              <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-2xl font-extrabold text-zinc-900">20 EUR/mese + IVA</p>
                <p className="mt-1 text-sm text-zinc-600">Addebito automatico, nessuna sorpresa, nessun costo nascosto.</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border border-zinc-200 bg-white p-3">
                  <p className="text-xs text-zinc-500">Tempo medio risparmiato</p>
                  <p className="font-bold text-zinc-900">+5h / settimana</p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white p-3">
                  <p className="text-xs text-zinc-500">Setup iniziale</p>
                  <p className="font-bold text-zinc-900">~15 minuti</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-red-200 bg-gradient-to-r from-red-50 via-white to-rose-50 p-5 shadow-sm md:p-7">
          <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-red-700">No-show sotto controllo</p>
              <h2 className="mt-2 text-3xl font-black text-zinc-900 md:text-4xl">Riduci le assenze e proteggi il fatturato</h2>
              <p className="mt-3 text-sm text-zinc-700 md:text-base">
                In Grooming Revolution il no-show non e un problema invisibile: lo misuri, lo monitori per sede e operatore, e agisci subito con flussi piu ordinati.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center">
                <p className="text-xs text-zinc-500">No-show rate</p>
                <p className="text-xl font-black text-zinc-900">LIVE</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center">
                <p className="text-xs text-zinc-500">Conferme</p>
                <p className="text-xl font-black text-zinc-900">TRACK</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center">
                <p className="text-xs text-zinc-500">Storico</p>
                <p className="text-xl font-black text-zinc-900">KPI</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {keyPoints.map((item) => (
            <article key={item} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-zinc-800">{item}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:p-8">
          <h2 className="text-2xl font-black text-zinc-900 md:text-3xl">Esperienze reali di chi lo usa tutti i giorni</h2>
          <p className="mt-2 text-sm text-zinc-600 md:text-base">
            Team grooming che vogliono lavorare in modo piu semplice, piu veloce e con dati finalmente chiari.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {testimonials.map((t) => (
              <article key={t.name} className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                <p className="text-sm text-zinc-700">{t.text}</p>
                <p className="mt-3 text-sm font-bold text-zinc-900">{t.name}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.result}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-zinc-900 p-6 text-zinc-100 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-black leading-tight">Passa a un gestionale davvero professionale</h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-200 md:text-base">
                Parti gratis, scala quando cresci: fino a 100 clienti non paghi. Oltre, costo fisso 20 EUR/mese + IVA.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-amber-300"
              >
                Crea account gratis
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-zinc-600 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-800"
              >
                Accedi subito
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

