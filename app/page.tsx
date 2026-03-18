import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Dog,
  Euro,
  Layers3,
  ShieldCheck,
  Users,
} from "lucide-react";
import { authOptions } from "@/lib/auth";

const coreFeatures = [
  {
    title: "Agenda operativa reale",
    text: "Vista per operatori e sedi, slot chiari, note personali e appuntamenti gestiti in pochi tocchi.",
    icon: CalendarDays,
  },
  {
    title: "Clienti e cani in un unico flusso",
    text: "Schede complete, storico trattamenti, informazioni utili sempre disponibili durante la giornata.",
    icon: Dog,
  },
  {
    title: "Controllo incassi e margini",
    text: "Importi, mancia, metodi di pagamento e KPI per capire subito dove guadagni di piu.",
    icon: Euro,
  },
  {
    title: "Multi-sede senza caos",
    text: "Ogni sede separata ma gestibile in modo veloce, con visione totale quando serve.",
    icon: Layers3,
  },
  {
    title: "Report che fanno decidere",
    text: "No-show rate, ritorno clienti, top servizi e performance operatori con dati concreti.",
    icon: BarChart3,
  },
  {
    title: "Ruoli e affidabilita",
    text: "Owner, manager e staff con permessi chiari per lavorare bene anche quando il team cresce.",
    icon: ShieldCheck,
  },
];

const testimonials = [
  {
    name: "Cecilia, owner",
    quote:
      "Con due sedi avevo tutto sparso. Ora l agenda e pulita, gli incassi sono sotto controllo e il team lavora senza confusione.",
    result: "Meno errori operativi settimana dopo settimana",
  },
  {
    name: "Marco, manager",
    quote:
      "Prima chiudevamo le giornate a memoria. Adesso vedo no-show, operatori e trend in tempo reale. Decidere e molto piu semplice.",
    result: "Controllo reale sui numeri del salone",
  },
  {
    name: "Alessio, multi-sede",
    quote:
      "La parte migliore e la velocita: scelgo sede, vedo subito la situazione, assegno appuntamenti e non perdo tempo.",
    result: "Workflow fluido su desktop, tablet e mobile",
  },
];

const faqs = [
  {
    q: "Quanto costa?",
    a: "Fino a 100 clienti e gratis. Oltre 100 clienti, piano FULL a 20 EUR/mese + IVA con addebito automatico.",
  },
  {
    q: "Funziona bene anche da smartphone?",
    a: "Si. L interfaccia e progettata per uso operativo quotidiano su mobile, tablet e desktop.",
  },
  {
    q: "Posso gestire piu sedi?",
    a: "Si. Ogni sede mantiene dati separati. Puoi lavorare per singola sede o vedere aggregati quando serve.",
  },
  {
    q: "E adatto anche a team con piu operatori?",
    a: "Si. Puoi configurare operatori, giorni e orari di lavoro e usarli direttamente in agenda.",
  },
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10 xl:px-12">
      <div className="mx-auto max-w-[1380px] space-y-6">
        <section className="rounded-3xl border border-zinc-200 bg-white/90 p-5 shadow-sm md:p-8 xl:p-10">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
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
                SaaS gestionale professionale per toelettatura
              </p>
              <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-zinc-900 md:text-5xl xl:text-6xl">
                Unico sistema per far crescere il tuo salone con ordine, controllo e velocita
              </h1>
              <p className="mt-4 max-w-3xl text-base text-zinc-700 md:text-lg">
                Grooming Revolution nasce per eliminare caos operativo, appuntamenti confusi e decisioni a istinto.
                Gestisci tutto in un unico spazio: agenda, clienti, cani, operatori, sedi, incassi e KPI.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-amber-400"
                >
                  Inizia gratis ora
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
                >
                  Accedi
                </Link>
              </div>
            </div>

            <div className="grid gap-3">
              <article className="rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Pricing trasparente</p>
                <p className="mt-2 text-3xl font-black text-zinc-900">Gratis fino a 100 clienti</p>
                <p className="mt-2 text-sm text-zinc-700">
                  Oltre 100 clienti, piano FULL fisso a 20 EUR/mese + IVA. Nessun costo nascosto.
                </p>
              </article>
              <article className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 via-white to-rose-50 p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-red-700">No-show in evidenza</p>
                <h2 className="mt-1 text-2xl font-black text-zinc-900">Riduci assenze, proteggi agenda e fatturato</h2>
                <p className="mt-2 text-sm text-zinc-700">
                  Misura il no-show rate, monitora trend per sede e operatore e agisci con dati chiari.
                </p>
              </article>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center">
                  <p className="text-xs text-zinc-500">Agenda</p>
                  <p className="font-black text-zinc-900">SMART</p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center">
                  <p className="text-xs text-zinc-500">Dati</p>
                  <p className="font-black text-zinc-900">LIVE</p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center">
                  <p className="text-xs text-zinc-500">Costo</p>
                  <p className="font-black text-zinc-900">FISSO</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:p-8">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-zinc-700" />
            <h2 className="text-2xl font-black text-zinc-900 md:text-3xl">Pensato per il lavoro vero in salone</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {coreFeatures.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                  <div className="mb-3 inline-flex rounded-lg border border-zinc-300 bg-white p-2">
                    <Icon className="h-5 w-5 text-zinc-700" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-zinc-700">{item.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:p-8">
          <h2 className="text-2xl font-black text-zinc-900 md:text-3xl">Perche e diverso da un gestionale tradizionale</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <h3 className="text-lg font-bold text-zinc-900">Metodo vecchio</h3>
              <ul className="mt-3 space-y-2 text-sm text-zinc-700">
                <li>Agenda confusa e poca visibilita sugli operatori</li>
                <li>Dati sparsi tra chat, fogli e memoria</li>
                <li>No-show non misurato in modo consistente</li>
                <li>Scelte economiche senza KPI affidabili</li>
              </ul>
            </article>
            <article className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
              <h3 className="text-lg font-bold text-zinc-900">Con Grooming Revolution</h3>
              <ul className="mt-3 space-y-2 text-sm text-zinc-800">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-800" />
                  Agenda operativa chiara su tutte le sedi
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-800" />
                  Workflow unico per clienti, cani e trattamenti
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-800" />
                  No-show e KPI sempre visibili e confrontabili
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-800" />
                  Decisioni veloci grazie a report e numeri reali
                </li>
              </ul>
            </article>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:p-8">
          <h2 className="text-2xl font-black text-zinc-900 md:text-3xl">Esperienze e recensioni</h2>
          <p className="mt-2 text-sm text-zinc-600 md:text-base">
            Saloni che hanno scelto di lavorare in modo piu semplice, piu preciso e piu redditizio.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {testimonials.map((t) => (
              <article key={t.name} className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                <p className="text-sm text-zinc-700">{t.quote}</p>
                <p className="mt-3 text-sm font-bold text-zinc-900">{t.name}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.result}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-zinc-900 p-6 text-zinc-100 shadow-sm md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2 className="text-3xl font-black leading-tight">Passa a un SaaS davvero professionale per grooming</h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-200 md:text-base">
                Fino a 100 clienti e gratis. Quando cresci, paghi solo 20 EUR/mese + IVA. Costo fisso, controllo totale.
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

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:p-8">
          <h2 className="text-2xl font-black text-zinc-900 md:text-3xl">FAQ rapide</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {faqs.map((item) => (
              <article key={item.q} className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                <h3 className="text-sm font-bold text-zinc-900">{item.q}</h3>
                <p className="mt-2 text-sm text-zinc-700">{item.a}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
