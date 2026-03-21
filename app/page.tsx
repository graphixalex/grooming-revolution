import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  BarChart3,
  BellRing,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Dog,
  Euro,
  Layers3,
  MessageCircle,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { authOptions } from "@/lib/auth";

const pillars = [
  {
    title: "Agenda multi-operatore",
    text: "Colonne per operatore, turni reali e assegnazione rapida: finalmente un calendario operativo e non teorico.",
    icon: CalendarDays,
  },
  {
    title: "Clienti + cani + storico",
    text: "Ogni scheda è completa: dati utili, note, trattamenti e contesto reale per lavorare meglio.",
    icon: Dog,
  },
  {
    title: "No-show sotto controllo",
    text: "Tracciamento chiaro del tasso no-show, con visione per sede e operatore per agire in modo concreto.",
    icon: BellRing,
  },
  {
    title: "Contabilità semplice",
    text: "Incassi, mancia, metodi pagamento e KPI immediati per decisioni rapide e margini più controllati.",
    icon: Euro,
  },
  {
    title: "Multi-sede professionale",
    text: "Ogni sede separata, dati puliti, confronto aggregato quando serve: niente confusione tra attività.",
    icon: Building2,
  },
  {
    title: "Report che guidano",
    text: "LTV, ritorno clienti, top servizi, performance team: numeri veri per crescere con metodo.",
    icon: BarChart3,
  },
];

const testimonials = [
  {
    name: "Cecilia, Owner",
    role: "2 sedi attive",
    quote:
      "Prima lavoravo a memoria. Adesso vedo tutto: agenda, operatori, no-show e incassi. Il salone è più ordinato e più redditizio.",
    kpi: "-37% no-show in 2 mesi",
  },
  {
    name: "Marco, Manager",
    role: "Team 4 operatori",
    quote:
      "Con l'agenda a colonne per operatore abbiamo eliminato sovrapposizioni e tempi morti. Il team lavora molto meglio.",
    kpi: "+5h/sett risparmiate",
  },
  {
    name: "Alessio, Multi-sede",
    role: "Owner",
    quote:
      "Il passaggio tra sedi è immediato, i dati restano separati ma posso vedere il totale quando devo decidere.",
    kpi: "Controllo completo giornaliero",
  },
];

const faqs = [
  {
    q: "Quanto costa davvero?",
    a: "Gratis fino a 50 clienti. Dopo 50 clienti: piano FULL a 20 EUR/mese + IVA, costo fisso.",
  },
  {
    q: "È adatto a mobile/tablet?",
    a: "Sì. È stato progettato per uso operativo quotidiano su smartphone, tablet e desktop.",
  },
  {
    q: "Gestisce team e turni operatori?",
    a: "Sì. Configuri giorni/orari operatori e li usi direttamente in agenda per assegnazioni rapide.",
  },
  {
    q: "Posso gestire più sedi?",
    a: "Sì. Ogni sede ha dati separati, con possibilità di visione aggregata per KPI e contabilità.",
  },
  {
    q: "Ho già una lista clienti: devo inserirla a mano?",
    a: "No. Se hai un file clienti (Excel/CSV), ci contatti e il team dev si occupa direttamente dell'importazione guidata.",
  },
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  return (
    <main className="relative min-h-screen overflow-hidden px-3 py-4 sm:px-4 sm:py-6 md:px-8 md:py-10 xl:px-12 2xl:px-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-rose-200/45 blur-3xl" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-amber-200/35 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-zinc-300/25 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[1880px] space-y-6">
        <section className="rounded-3xl border border-zinc-200 bg-white/92 p-4 shadow-sm md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="h-16 w-full max-w-[360px] overflow-hidden rounded-lg border border-rose-300 bg-gradient-to-r from-rose-100 via-rose-100 to-pink-200 p-1">
              <Image
                src="/img/logo-grooming-revolution.png"
                alt="Grooming Revolution"
                width={640}
                height={180}
                className="h-full w-full origin-center object-contain object-center scale-[2.9] translate-y-[12px]"
                priority
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/login"
                className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                Accedi
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-amber-400"
              >
                Inizia gratis
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white/92 p-5 shadow-sm md:p-8 xl:p-10">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold tracking-wide text-white">
                <Sparkles className="h-3.5 w-3.5" />
                SaaS top per toelettatura professionale
              </p>
              <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-zinc-900 md:text-5xl xl:text-7xl">
                Il sistema che trasforma il tuo salone in una macchina organizzata
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-700 md:text-lg">
                Grooming Revolution unisce agenda operativa, gestione team, multi-sede, clienti, cani,
                contabilità e KPI in un unico flusso. Meno caos, meno no-show, più controllo vero.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-amber-400"
                >
                  Crea account ora
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
                >
                  Vado al login
                </Link>
              </div>
            </div>

            <div className="grid gap-3">
              <article className="rounded-2xl border border-zinc-200 bg-gradient-to-r from-zinc-900 to-zinc-800 p-5 text-white shadow-sm">
                <p className="text-xs uppercase tracking-wide text-zinc-300">Modello prezzo semplice</p>
                <p className="mt-1 text-3xl font-black">Gratis fino a 50 clienti</p>
                <p className="mt-1 text-sm text-zinc-200">Oltre 50: FULL a 20 EUR/mese + IVA, costo fisso.</p>
              </article>
              <article className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 via-white to-rose-50 p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-red-700">No-show in evidenza</p>
                <p className="mt-1 text-2xl font-black text-zinc-900">Monitori, misuri, riduci</p>
                <p className="mt-1 text-sm text-zinc-700">
                  Dato centrale per proteggere agenda, team e fatturato giornaliero.
                </p>
              </article>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center">
                  <Clock3 className="mx-auto h-4 w-4 text-zinc-700" />
                  <p className="mt-1 text-xs text-zinc-500">Tempo</p>
                  <p className="font-black text-zinc-900">+5h</p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center">
                  <TrendingUp className="mx-auto h-4 w-4 text-zinc-700" />
                  <p className="mt-1 text-xs text-zinc-500">Ordine</p>
                  <p className="font-black text-zinc-900">UP</p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center">
                  <Users className="mx-auto h-4 w-4 text-zinc-700" />
                  <p className="mt-1 text-xs text-zinc-500">Team</p>
                  <p className="font-black text-zinc-900">SYNC</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:p-8">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold tracking-wide text-emerald-800">
                <MessageCircle className="h-3.5 w-3.5" />
                Comunicazioni clienti
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-zinc-900 md:text-4xl">
                Comunicazioni WhatsApp rapide, professionali, sempre tracciabili
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-700 md:text-base">
                Durante la gestione appuntamenti puoi aprire subito WhatsApp con testo preimpostato personalizzato.
                Hai template configurabili WhatsApp in impostazioni, con invio manuale o tramite WhatsApp Business API,
                così il team comunica in modo
                professionale e coerente senza perdere tempo.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">WhatsApp</p>
                  <p className="text-sm font-bold text-zinc-900">Messaggio precompilato in 1 click</p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">WhatsApp Business API</p>
                  <p className="text-sm font-bold text-zinc-900">Invio automatico quando vuoi scalare</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-emerald-50 p-4">
              <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
                <p className="text-xs text-zinc-500">Anteprima messaggio</p>
                <div className="mt-2 rounded-lg bg-emerald-100/80 p-3 text-sm text-zinc-800">
                  Ciao Cecilia, ti confermiamo l&apos;appuntamento di Luna il 22/03 alle 14:30 presso Paradiso.
                </div>
                <div className="mt-2 flex items-center justify-end gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-zinc-200 bg-white p-3 text-center">
                  <p className="text-[11px] text-zinc-500">Template</p>
                  <p className="text-sm font-black text-zinc-900">ON</p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white p-3 text-center">
                  <p className="text-[11px] text-zinc-500">Invio</p>
                  <p className="text-sm font-black text-zinc-900">1 CLICK</p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white p-3 text-center">
                  <p className="text-[11px] text-zinc-500">No-show</p>
                  <p className="text-sm font-black text-zinc-900">TRACK</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-5 shadow-sm md:p-8">
          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold tracking-wide text-emerald-800">
                <CalendarDays className="h-3.5 w-3.5" />
                Booking online sicuro
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-zinc-900 md:text-4xl">
                Prenotazioni clienti smart, senza overbooking e con controllo tempi reali
              </h2>
              <p className="mt-2 text-sm text-zinc-700 md:text-base">
                Il cliente vede solo gli slot realmente disponibili. Il motore considera agenda, operatori, orari,
                assenze e durata servizi basata su taglia/pelo/trattamento.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700" />Niente sovrapposizioni in agenda</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700" />6 opzioni settimanali realmente prenotabili</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700" />Nuovi clienti in richiesta con verifica team</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="text-xs text-zinc-500">Flusso operativo</p>
              <p className="mt-1 text-lg font-black text-zinc-900">Cliente, slot disponibile, team, agenda confermata</p>
              <p className="mt-2 text-sm text-zinc-700">
                Per i saloni: massima sicurezza operativa. Per i clienti: esperienza veloce, chiara e mobile-first.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-zinc-500">Focus giornaliero</p>
            <p className="mt-1 text-xl font-black text-zinc-900">Agenda + Operatori + Incassi</p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-zinc-500">Scalabilità</p>
            <p className="mt-1 text-xl font-black text-zinc-900">Da 1 sede a multi-sede senza attriti</p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-zinc-500">Decisioni</p>
            <p className="mt-1 text-xl font-black text-zinc-900">KPI reali invece di intuizioni</p>
          </article>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:p-8">
          <h2 className="text-2xl font-black text-zinc-900 md:text-3xl">Stack operativo completo</h2>
          <p className="mt-2 text-sm text-zinc-600 md:text-base">
            Non un tool parziale: un sistema completo per lavorare meglio ogni giorno.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pillars.map((item) => {
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
          <h2 className="text-2xl font-black text-zinc-900 md:text-3xl">Perché chi gestisce un salone lo sceglie</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {testimonials.map((t) => (
              <article key={t.name} className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                <div className="mb-3 flex items-center gap-1 text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                </div>
                <p className="text-sm text-zinc-700">{t.quote}</p>
                <p className="mt-3 text-sm font-bold text-zinc-900">{t.name}</p>
                <p className="text-xs text-zinc-500">{t.role}</p>
                <p className="mt-2 inline-flex rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-zinc-800">
                  {t.kpi}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-cyan-50 p-5 shadow-sm md:p-8">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-sky-800">Onboarding assistito</p>
              <h2 className="mt-1 text-3xl font-black text-zinc-900 md:text-4xl">
                Hai già una lista clienti? La importiamo noi.
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-zinc-700 md:text-base">
                Se arrivi da Excel, CSV o da un altro gestionale, non perdi ore in inserimenti manuali:
                il team dev si occupa direttamente dell&apos;importazione nel tuo account in modo rapido e guidato.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sky-700" />
                  Nessuna perdita di tempo in copia-incolla
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sky-700" />
                  Allineamento campi con verifica pre-import
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sky-700" />
                  Supporto diretto del team tecnico
                </li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://wa.me/41784104391?text=Ciao%2C%20ho%20gia%20una%20lista%20clienti%20e%20vorrei%20supporto%20per%20l%20importazione."
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500"
              >
                Contattaci per importare i clienti
              </a>
              <Link
                href="/register"
                className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                Inizia gratis intanto
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-zinc-900 p-6 text-zinc-100 shadow-sm md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-400">Piano unico e trasparente</p>
              <h2 className="mt-1 text-3xl font-black leading-tight">Cresci senza sorprese sui costi</h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-200 md:text-base">
                Fino a 50 clienti: gratis. Oltre: 20 EUR/mese + IVA. Prezzo basso, fisso, chiaro.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-200">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-300" />
                  Nessun costo nascosto
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-300" />
                  Nessuna complessità inutile
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-300" />
                  Focus totale su operatività e crescita
                </li>
              </ul>
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

        <section className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-100/50 p-5 shadow-sm md:p-8">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-600">Offerta chiara per decidere ora</p>
              <h2 className="mt-1 text-3xl font-black text-zinc-900 md:text-4xl">
                Parti gratis oggi. Paghi solo quando superi 50 clienti.
              </h2>
              <p className="mt-2 text-sm text-zinc-700 md:text-base">
                Niente rischio iniziale: testi il sistema, organizzi il salone e cresci. Quando superi 50 clienti,
                il piano FULL resta fisso a 20 EUR/mese + IVA.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-amber-400"
              >
                Attiva account gratuito
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                Accedi al tuo account
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:p-8">
          <div className="mb-4 flex items-center gap-2">
            <Layers3 className="h-5 w-5 text-zinc-700" />
            <h2 className="text-2xl font-black text-zinc-900 md:text-3xl">FAQ</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {faqs.map((item) => (
              <article key={item.q} className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                <h3 className="text-sm font-bold text-zinc-900">{item.q}</h3>
                <p className="mt-2 text-sm text-zinc-700">{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="rounded-3xl border border-zinc-200 bg-zinc-950 p-6 text-zinc-200 shadow-sm md:p-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-sm font-semibold">Cecilia Luxury Grooming</p>
              <p className="mt-1 text-xs text-zinc-400">Sede legale: Paradiso, Ticino, Svizzera</p>
              <p className="text-xs text-zinc-400">Piattaforma SaaS per toelettature professionali</p>
            </div>
            <div>
              <p className="text-sm font-semibold">Contatti</p>
              <p className="mt-1 text-xs text-zinc-400">Telefono: +41 00 000 00 00</p>
              <p className="text-xs text-zinc-400">WhatsApp: +41 00 000 00 00</p>
              <p className="text-xs text-zinc-400">Assistenza clienti via WhatsApp Business</p>
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
          <p className="mt-6 text-xs text-zinc-500">© {new Date().getFullYear()} Cecilia Luxury Grooming. Tutti i diritti riservati.</p>
        </footer>
      </div>
    </main>
  );
}
