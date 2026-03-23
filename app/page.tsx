import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Manrope, Space_Grotesk } from "next/font/google";
import {
  ArrowRight,
  BellRing,
  Building2,
  CalendarDays,
  CheckCircle2,
  Dog,
  Layers3,
  MessageCircle,
  Smartphone,
  Star,
  TrendingUp,
} from "lucide-react";
import { authOptions } from "@/lib/auth";

const headingFont = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"] });
const bodyFont = Manrope({ subsets: ["latin"], weight: ["400", "500", "700"] });

const features = [
  {
    icon: CalendarDays,
    title: "Agenda multi-operatore",
    text: "Vista chiara per operatore con durata reale appuntamenti, spostamenti rapidi e controllo dei turni.",
  },
  {
    icon: Dog,
    title: "Schede cliente e pet",
    text: "Storico completo: trattamenti, note, preferenze, taglia e contesto operativo sempre disponibile.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp automatico",
    text: "Conferme e reminder con template personalizzati. Manuale subito, API quando vuoi scalare.",
  },
  {
    icon: Building2,
    title: "Gestione multi-sede",
    text: "Sedi separate e pulite, con controllo centrale quando serve prendere decisioni veloci.",
  },
  {
    icon: TrendingUp,
    title: "Report e KPI reali",
    text: "No-show, ritorno clienti, performance team e fatturato per capire cosa migliorare subito.",
  },
  {
    icon: Smartphone,
    title: "Mobile first",
    text: "Agenda, appuntamenti, messaggi e incassi operativi da smartphone, tablet e desktop.",
  },
];

const setup = [
  "Imposta listino con prezzi e durata media per taglia/servizio.",
  "Configura team, ruoli, turni e giorni di apertura per sede.",
  "Attiva WhatsApp per conferme e reminder automatici.",
  "Inizia a lavorare con agenda e dati sempre allineati.",
];

const faqs = [
  {
    q: "Quanto costa?",
    a: "Gratis fino a 50 clienti. Oltre 50 clienti: piano FULL a 20 EUR/mese + IVA.",
  },
  {
    q: "Funziona su smartphone?",
    a: "Si. L'interfaccia e progettata per uso operativo su mobile, tablet e desktop.",
  },
  {
    q: "Gestisce anche piu sedi?",
    a: "Si. Ogni sede ha dati separati, con controllo aggregato per owner e manager.",
  },
  {
    q: "Posso importare la mia lista clienti?",
    a: "Si. Se hai CSV/Excel ti aiutiamo nell'importazione iniziale con supporto diretto.",
  },
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  return (
    <main className={`${bodyFont.className} landing-shell min-h-screen px-4 py-5 md:px-8 md:py-8`}>
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5">
        <header className="landing-card sticky top-3 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-3 py-2 md:px-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-28 overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 md:w-36">
              <Image
                src="/img/logo-grooming-revolution.png"
                alt="Grooming Revolution"
                width={640}
                height={180}
                className="h-full w-full scale-[2.7] object-contain object-center"
                priority
              />
            </div>
            <span className="hidden rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-zinc-600 sm:inline-flex">
              SOFTWARE PROFESSIONALE PER TOELETTATURE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
              Accedi
            </Link>
            <Link href="/register" className="rounded-xl bg-[#ff7a18] px-4 py-2 text-sm font-semibold text-white hover:bg-[#eb6f15]">
              Inizia gratis
            </Link>
          </div>
        </header>

        <section className="landing-card rounded-3xl p-5 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                <BellRing className="h-3.5 w-3.5" />
                Riduci caos, no-show e tempi morti
              </p>
              <h1 className={`${headingFont.className} mt-4 text-4xl font-bold leading-[1.04] tracking-tight text-zinc-950 md:text-6xl`}>
                Il gestionale per far lavorare il tuo salone come un team pro.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-700 md:text-lg">
                Agenda, clienti, cani, listino, team, sedi, WhatsApp e report in un unico flusso operativo.
                Niente dispersione. Solo controllo reale della giornata.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800">
                  Crea account gratuito
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="https://wa.me/41784104391?text=Ciao%2C%20voglio%20una%20demo%20di%20Grooming%20Revolution."
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                >
                  Prenota demo WhatsApp
                </a>
              </div>
              <div className="mt-5 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Gratis fino a 50 clienti</p>
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />20 EUR/mese + IVA oltre soglia</p>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Anteprima operativa</p>
              <div className="mt-3 space-y-2">
                <div className="rounded-xl border border-zinc-200 bg-white p-3">
                  <p className="text-xs text-zinc-500">Lunedi 11:00</p>
                  <p className="mt-1 text-sm font-bold text-zinc-900">Pippo / Alessio</p>
                  <p className="text-xs text-zinc-600">Bagno + taglio - 120 minuti</p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-3">
                  <p className="text-xs text-zinc-500">Reminder</p>
                  <p className="mt-1 text-sm font-bold text-zinc-900">WhatsApp inviato automaticamente</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-zinc-900 px-3 py-2 text-white">
                    <p className="text-[11px] text-zinc-300">No-show</p>
                    <p className="text-base font-bold">-37%</p>
                  </div>
                  <div className="rounded-lg bg-cyan-100 px-3 py-2 text-cyan-800">
                    <p className="text-[11px]">Team</p>
                    <p className="text-base font-bold">SYNC</p>
                  </div>
                  <div className="rounded-lg bg-amber-100 px-3 py-2 text-amber-800">
                    <p className="text-[11px]">Incassi</p>
                    <p className="text-base font-bold">UP</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="landing-card rounded-2xl p-4">
                <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                  <Icon className="h-5 w-5 text-zinc-700" />
                </div>
                <h2 className={`${headingFont.className} mt-3 text-xl font-bold text-zinc-900`}>{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">{item.text}</p>
              </article>
            );
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
          <article className="landing-card rounded-3xl p-5 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Onboarding</p>
            <h3 className={`${headingFont.className} mt-2 text-3xl font-bold leading-tight text-zinc-900 md:text-4xl`}>
              Parti in modo ordinato, senza perdere settimane
            </h3>
            <div className="mt-5 space-y-3">
              {setup.map((step, i) => (
                <div key={step} className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <p className="text-sm font-medium text-zinc-800">{step}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="landing-card rounded-3xl p-5 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Migrazione dati</p>
            <h3 className={`${headingFont.className} mt-2 text-3xl font-bold leading-tight text-zinc-900 md:text-4xl`}>
              Hai gia un archivio clienti? Lo carichiamo noi.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-700">
              Se hai un file Excel o CSV, il team ti supporta nella migrazione per partire subito senza copia-incolla manuali.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href="https://wa.me/41784104391?text=Ciao%2C%20ho%20gia%20una%20lista%20clienti%20e%20vorrei%20supporto%20per%20l%20importazione."
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500"
              >
                Contattaci per importazione
              </a>
              <Link href="/register" className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
                Inizia gratis intanto
              </Link>
            </div>
          </article>
        </section>

        <section className="landing-card rounded-3xl p-5 md:p-8">
          <h3 className={`${headingFont.className} text-3xl font-bold text-zinc-900 md:text-4xl`}>Perche i saloni ci scelgono</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="mb-2 flex items-center gap-1 text-amber-500">
                <Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" />
              </div>
              <p className="text-sm text-zinc-700">Con agenda e WhatsApp automatico abbiamo ridotto i buchi in giornata.</p>
              <p className="mt-3 text-sm font-bold text-zinc-900">Cecilia, Owner</p>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="mb-2 flex items-center gap-1 text-amber-500">
                <Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" />
              </div>
              <p className="text-sm text-zinc-700">Ogni operatore ha il suo flusso, meno caos e piu controllo sul servizio.</p>
              <p className="mt-3 text-sm font-bold text-zinc-900">Marco, Manager</p>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="mb-2 flex items-center gap-1 text-amber-500">
                <Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" />
              </div>
              <p className="text-sm text-zinc-700">Con multi-sede abbiamo finalmente una gestione pulita e dati affidabili.</p>
              <p className="mt-3 text-sm font-bold text-zinc-900">Alessio, Owner</p>
            </article>
          </div>
        </section>

        <section className="landing-card rounded-3xl p-5 md:p-8">
          <div className="mb-4 flex items-center gap-2">
            <Layers3 className="h-5 w-5 text-zinc-700" />
            <h3 className={`${headingFont.className} text-3xl font-bold text-zinc-900`}>FAQ</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {faqs.map((item) => (
              <article key={item.q} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <h4 className="text-sm font-bold text-zinc-900">{item.q}</h4>
                <p className="mt-2 text-sm text-zinc-700">{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-card rounded-3xl border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-5 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-700">Prezzo chiaro</p>
              <h3 className={`${headingFont.className} mt-1 text-3xl font-bold text-zinc-900 md:text-5xl`}>
                Gratis oggi, costo fisso quando cresci
              </h3>
              <p className="mt-2 max-w-2xl text-sm text-zinc-700 md:text-base">
                Nessun piano confuso. Nessun costo nascosto. Solo un modello semplice per lavorare e scalare.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/register" className="rounded-xl bg-[#ff7a18] px-5 py-3 text-sm font-semibold text-white hover:bg-[#eb6f15]">
                Attiva account gratuito
              </Link>
              <Link href="/login" className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
                Vai al login
              </Link>
            </div>
          </div>
        </section>

        <footer className="rounded-3xl border border-zinc-200 bg-zinc-950 p-6 text-zinc-200 md:p-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-sm font-semibold">Grooming Revolution</p>
              <p className="mt-1 text-xs text-zinc-400">Software gestionale per toelettature professionali</p>
            </div>
            <div>
              <p className="text-sm font-semibold">Navigazione</p>
              <div className="mt-1 flex flex-col gap-1 text-xs text-zinc-400">
                <Link href="/login" className="hover:text-white">Accedi</Link>
                <Link href="/register" className="hover:text-white">Inizia gratis</Link>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold">Legale</p>
              <div className="mt-1 flex flex-col gap-1 text-xs">
                <Link href="/legal/privacy" className="text-zinc-300 hover:text-white">Privacy Policy</Link>
                <Link href="/legal/terms" className="text-zinc-300 hover:text-white">Termini di Servizio</Link>
                <Link href="/legal/cookies" className="text-zinc-300 hover:text-white">Cookie Policy</Link>
              </div>
            </div>
          </div>
          <p className="mt-6 text-xs text-zinc-500">© {new Date().getFullYear()} Grooming Revolution. Tutti i diritti riservati.</p>
        </footer>
      </div>
    </main>
  );
}
