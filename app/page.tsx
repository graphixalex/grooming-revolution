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
  Clock3,
  Dog,
  Layers3,
  MessageCircle,
  Sparkles,
  Star,
  TrendingUp,
  Users2,
} from "lucide-react";
import { authOptions } from "@/lib/auth";

const headingFont = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"] });
const bodyFont = Manrope({ subsets: ["latin"], weight: ["400", "500", "700"] });

const modules = [
  {
    icon: CalendarDays,
    title: "Agenda visuale multi-operatore",
    text: "Blocchi chiari, drag and drop, durata reale e controllo totale della giornata.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp operativo",
    text: "Conferme e reminder veloci con template pronti e invio strutturato.",
  },
  {
    icon: Dog,
    title: "Schede cliente complete",
    text: "Storico cani, trattamenti, note e preferenze in un unico flusso.",
  },
  {
    icon: TrendingUp,
    title: "Metriche che guidano",
    text: "No-show, ritorni e fatturato per decidere con numeri e non sensazioni.",
  },
];

const setupSteps = [
  "Crea listino con prezzi e durata media per taglia.",
  "Imposta operatori, turni e giorni di apertura per ogni sede.",
  "Attiva WhatsApp e automatizza conferme e promemoria.",
  "Inizia a prendere appuntamenti da desktop o smartphone.",
];

const testimonials = [
  {
    name: "Cecilia, Owner",
    role: "2 sedi attive",
    quote: "Prima lavoravo a memoria. Ora agenda, no-show e incassi sono allineati ogni giorno.",
    kpi: "-37% no-show in 2 mesi",
  },
  {
    name: "Marco, Manager",
    role: "Team 4 operatori",
    quote: "Con le colonne per operatore abbiamo eliminato sovrapposizioni e tempi morti.",
    kpi: "+5h/sett risparmiate",
  },
  {
    name: "Alessio, Multi-sede",
    role: "Owner",
    quote: "Ogni sede resta pulita, ma posso avere la visione aggregata quando devo decidere.",
    kpi: "Controllo giornaliero completo",
  },
];

const faqs = [
  {
    q: "Quanto costa davvero?",
    a: "Gratis fino a 50 clienti. Oltre 50 clienti: FULL a 20 EUR/mese + IVA.",
  },
  {
    q: "E adatto a smartphone?",
    a: "Si, e pensato per uso operativo quotidiano su mobile, tablet e desktop.",
  },
  {
    q: "Posso gestire piu sedi?",
    a: "Si. Dati separati per sede, con visione aggregata quando serve.",
  },
  {
    q: "Se ho gia una lista clienti?",
    a: "Ti aiutiamo a importarla: supportiamo onboarding da CSV/Excel con assistenza del team.",
  },
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  return (
    <main className={`${bodyFont.className} landing-shell min-h-screen px-4 py-5 md:px-8 md:py-8`}>
      <div className="landing-noise" />
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-5">
        <header className="landing-glass sticky top-3 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-3 py-2 md:px-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-28 overflow-hidden rounded-lg border border-white/30 bg-white/70 p-1 md:w-36">
              <Image
                src="/img/logo-grooming-revolution.png"
                alt="Grooming Revolution"
                width={640}
                height={180}
                className="h-full w-full scale-[2.7] object-contain object-center"
                priority
              />
            </div>
            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-cyan-700">
              SAAS GROOMING
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
              Accedi
            </Link>
            <Link href="/register" className="rounded-xl bg-[#ff7a18] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(255,122,24,0.35)] hover:bg-[#eb6f15]">
              Inizia gratis
            </Link>
          </div>
        </header>

        <section className="landing-glass relative overflow-hidden rounded-[28px] px-5 py-7 md:px-9 md:py-10">
          <div className="landing-orb landing-orb-a" />
          <div className="landing-orb landing-orb-b" />
          <div className="grid gap-7 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative z-10">
              <p className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/85 px-3 py-1 text-xs font-bold text-zinc-700">
                <Sparkles className="h-3.5 w-3.5 text-[#ff7a18]" />
                Futuro operativo per toelettature
              </p>
              <h1 className={`${headingFont.className} mt-4 text-4xl font-bold leading-[1.03] tracking-tight text-zinc-950 md:text-6xl`}>
                La homepage ora dice subito una cosa: qui dentro gestisci tutto.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-700 md:text-lg">
                Grooming Revolution unisce agenda, team, clienti, listino, cassa, reminder e report in un sistema unico.
                Zero caos. Piu controllo. Piu margine.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800">
                  Crea account
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="https://wa.me/41784104391?text=Ciao%2C%20voglio%20vedere%20una%20demo%20di%20Grooming%20Revolution."
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                >
                  Richiedi demo WhatsApp
                </a>
              </div>
              <div className="mt-6 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Gratis fino a 50 clienti</p>
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />20 EUR/mese + IVA oltre soglia</p>
              </div>
            </div>

            <div className="relative z-10 grid gap-3">
              <article className="landing-panel landing-float rounded-2xl p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Live Snapshot</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-zinc-900 px-3 py-2 text-white">
                    <p className="text-[11px] text-zinc-300">No-show</p>
                    <p className="text-lg font-bold">-37%</p>
                  </div>
                  <div className="rounded-xl bg-cyan-100 px-3 py-2 text-cyan-800">
                    <p className="text-[11px]">Conferme</p>
                    <p className="text-lg font-bold">+82%</p>
                  </div>
                  <div className="rounded-xl bg-amber-100 px-3 py-2 text-amber-800">
                    <p className="text-[11px]">Produttivita</p>
                    <p className="text-lg font-bold">UP</p>
                  </div>
                </div>
              </article>
              <article className="landing-panel rounded-2xl p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Operativita in tempo reale</p>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
                    <span className="inline-flex items-center gap-2 font-medium text-zinc-700"><Clock3 className="h-4 w-4" />Lunedi 11:00</span>
                    <span className="rounded bg-[#214f9f] px-2 py-0.5 text-xs font-semibold text-white">Pippo / Alessio</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
                    <span className="inline-flex items-center gap-2 font-medium text-zinc-700"><BellRing className="h-4 w-4" />Reminder inviato</span>
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">WhatsApp</span>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          {modules.map((item, idx) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className={`landing-reveal rounded-2xl border border-zinc-200/80 bg-white/85 p-4 shadow-[0_10px_25px_rgba(14,22,38,0.08)] backdrop-blur ${idx % 2 === 0 ? "md:-translate-y-1" : "md:translate-y-1"}`}
              >
                <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                  <Icon className="h-5 w-5 text-zinc-700" />
                </div>
                <h2 className={`${headingFont.className} mt-3 text-lg font-bold text-zinc-900`}>{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">{item.text}</p>
              </article>
            );
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <article className="rounded-3xl border border-zinc-200 bg-white/90 p-5 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Comunicazioni clienti</p>
            <h3 className={`${headingFont.className} mt-2 text-3xl font-bold leading-tight text-zinc-900 md:text-4xl`}>
              WhatsApp integrato, professionale e tracciabile
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-700 md:text-base">
              Invio veloce dal planner con template personalizzati. Quando vuoi scalare, abiliti API e reminder automatici.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">Modalita rapida</p>
                <p className="text-sm font-bold text-zinc-900">Messaggio precompilato in 1 click</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">Modalita avanzata</p>
                <p className="text-sm font-bold text-zinc-900">API Meta con invio automatico</p>
              </div>
            </div>
          </article>
          <article className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-5 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Booking online</p>
            <h3 className={`${headingFont.className} mt-2 text-3xl font-bold leading-tight text-zinc-900 md:text-4xl`}>
              Slot reali, zero overbooking
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-zinc-700">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700" />Disponibilita basata su operatori e turni reali</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700" />Durata servizi per taglia/trattamento</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700" />Richieste clienti con conferma team</li>
            </ul>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
          <article className="rounded-3xl border border-zinc-200 bg-white/90 p-5 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Start rapido</p>
            <h3 className={`${headingFont.className} mt-2 text-3xl font-bold leading-tight text-zinc-900 md:text-4xl`}>
              Onboarding chiaro in 4 step
            </h3>
            <div className="mt-5 space-y-3">
              {setupSteps.map((step, i) => (
                <div key={step} className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <p className="text-sm font-medium text-zinc-800">{step}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-zinc-900 bg-zinc-950 p-5 text-zinc-100 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Mobile first reale</p>
            <h3 className={`${headingFont.className} mt-2 text-3xl font-bold leading-tight md:text-4xl`}>
              Dashboard veloce anche da smartphone
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              Lo staff apre agenda, aggiorna appuntamenti, invia reminder e registra incassi senza frizioni, anche fuori salone.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-zinc-800 p-3">
                <p className="inline-flex items-center gap-2 text-xs text-zinc-300"><Users2 className="h-4 w-4" />Team</p>
                <p className="mt-1 text-lg font-bold text-white">SYNC</p>
              </div>
              <div className="rounded-xl bg-zinc-800 p-3">
                <p className="inline-flex items-center gap-2 text-xs text-zinc-300"><MessageCircle className="h-4 w-4" />Reminder</p>
                <p className="mt-1 text-lg font-bold text-white">AUTO</p>
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
            <p className="text-xs text-zinc-500">Focus giornaliero</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">Agenda + Operatori + Incassi</p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
            <p className="text-xs text-zinc-500">Scalabilita</p>
            <p className="mt-1 inline-flex items-center gap-2 text-xl font-bold text-zinc-900"><Building2 className="h-5 w-5" />Da 1 sede a multi-sede</p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
            <p className="text-xs text-zinc-500">Decisioni</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">KPI reali, non intuizioni</p>
          </article>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white/90 p-5 md:p-8">
          <h3 className={`${headingFont.className} text-3xl font-bold text-zinc-900`}>Chi lo usa ogni giorno lo conferma</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {testimonials.map((item) => (
              <article key={item.name} className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                <div className="mb-2 flex items-center gap-1 text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                </div>
                <p className="text-sm text-zinc-700">{item.quote}</p>
                <p className="mt-3 text-sm font-bold text-zinc-900">{item.name}</p>
                <p className="text-xs text-zinc-500">{item.role}</p>
                <p className="mt-2 inline-flex rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-zinc-800">{item.kpi}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-cyan-50 p-5 md:p-8">
          <h3 className={`${headingFont.className} text-3xl font-bold text-zinc-900 md:text-4xl`}>
            Hai gia una lista clienti? La importiamo noi.
          </h3>
          <p className="mt-2 max-w-3xl text-sm text-zinc-700 md:text-base">
            Se arrivi da Excel o CSV, ti supportiamo noi nel caricamento iniziale cosi parti subito operativo.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="https://wa.me/41784104391?text=Ciao%2C%20ho%20gia%20una%20lista%20clienti%20e%20vorrei%20supporto%20per%20importarla."
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-500"
            >
              Contattaci per importazione
            </a>
            <Link href="/register" className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
              Intanto inizia gratis
            </Link>
          </div>
        </section>

        <section className="landing-glass rounded-3xl border border-amber-200/60 px-5 py-6 md:px-8 md:py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Piano unico</p>
              <h3 className={`${headingFont.className} mt-1 text-3xl font-bold text-zinc-900 md:text-5xl`}>
                Cresci senza costi a sorpresa
              </h3>
              <p className="mt-2 max-w-2xl text-sm text-zinc-700 md:text-base">
                Parti gratis, valida il metodo, poi resti su un costo fisso basso. Nessun pricing confuso.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/register" className="rounded-xl bg-[#ff7a18] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(255,122,24,0.32)] hover:bg-[#eb6f15]">
                Attiva account gratuito
              </Link>
              <Link href="/login" className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
                Vai al login
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white/90 p-5 md:p-8">
          <div className="mb-4 flex items-center gap-2">
            <Layers3 className="h-5 w-5 text-zinc-700" />
            <h3 className={`${headingFont.className} text-3xl font-bold text-zinc-900`}>FAQ</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {faqs.map((item) => (
              <article key={item.q} className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                <h4 className="text-sm font-bold text-zinc-900">{item.q}</h4>
                <p className="mt-2 text-sm text-zinc-700">{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="rounded-3xl border border-zinc-200 bg-zinc-950 p-6 text-zinc-200 md:p-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-sm font-semibold">Grooming Revolution</p>
              <p className="mt-1 text-xs text-zinc-400">SaaS per toelettature professionali</p>
            </div>
            <div>
              <p className="text-sm font-semibold">Contatti</p>
              <p className="mt-1 text-xs text-zinc-400">Supporto via WhatsApp Business</p>
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <Link href="/legal/privacy" className="text-zinc-300 hover:text-white">Privacy Policy</Link>
              <Link href="/legal/terms" className="text-zinc-300 hover:text-white">Termini di Servizio</Link>
              <Link href="/legal/cookies" className="text-zinc-300 hover:text-white">Cookie Policy</Link>
            </div>
          </div>
          <p className="mt-6 text-xs text-zinc-500">© {new Date().getFullYear()} Grooming Revolution. Tutti i diritti riservati.</p>
        </footer>
      </div>
    </main>
  );
}
