"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Manrope, Sora } from "next/font/google";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Dog,
  Layers3,
  MessageCircle,
  Smartphone,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

const headingFont = Sora({ subsets: ["latin"], weight: ["500", "700"] });
const bodyFont = Manrope({ subsets: ["latin"], weight: ["400", "500", "700"] });

const modules = [
  {
    icon: CalendarDays,
    title: "Agenda multi-operatore",
    text: "Blocchi appuntamento reali, drag and drop e controllo turni senza confusione.",
    ring: "ring-cyan-400/35",
    glow: "from-cyan-500/20 to-blue-500/20",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp automatico",
    text: "Conferme e reminder immediati con template personalizzati, manuale o API.",
    ring: "ring-emerald-400/35",
    glow: "from-emerald-500/20 to-green-500/20",
  },
  {
    icon: Dog,
    title: "Schede cliente + pet",
    text: "Storico completo su trattamenti, note e preferenze in un'unica scheda utile.",
    ring: "ring-fuchsia-400/35",
    glow: "from-fuchsia-500/20 to-pink-500/20",
  },
  {
    icon: Building2,
    title: "Gestione multi-sede",
    text: "Dati separati per sede, vista manageriale centrale quando serve decidere veloce.",
    ring: "ring-orange-400/35",
    glow: "from-orange-500/20 to-amber-500/20",
  },
  {
    icon: TrendingUp,
    title: "Report e KPI",
    text: "No-show, ritorni, incassi e performance team per decisioni concrete giornaliere.",
    ring: "ring-yellow-400/35",
    glow: "from-yellow-500/20 to-amber-500/20",
  },
  {
    icon: Smartphone,
    title: "Mobile-first reale",
    text: "Operativo da smartphone, tablet e desktop con stessa logica e stessa velocita.",
    ring: "ring-indigo-400/35",
    glow: "from-indigo-500/20 to-violet-500/20",
  },
];

const setup = [
  "Crea il listino con prezzi e durata media per taglia e servizio.",
  "Configura team, turni e giorni di apertura per ogni sede.",
  "Attiva WhatsApp per conferme e reminder automatici ai clienti.",
  "Importa i clienti: se hai gia una lista, contattaci e la carichiamo noi.",
  "Inizia la gestione completa da agenda, clienti, incassi e report.",
];

const faqs = [
  {
    q: "Quanto costa il gestionale?",
    a: "Gratis fino a 50 clienti. Oltre i 50 clienti il piano FULL e 20 EUR/mese + IVA.",
  },
  {
    q: "Posso usarlo da telefono?",
    a: "Si. L'interfaccia e progettata per uso operativo quotidiano anche da smartphone.",
  },
  {
    q: "Gestisce piu sedi?",
    a: "Si. Ogni sede mantiene dati separati, con controllo aggregato per owner e manager.",
  },
  {
    q: "Ho gia una lista clienti, va reinserita?",
    a: "No. Ti supportiamo nella migrazione da CSV o Excel in fase di onboarding.",
  },
];

const testimonials = [
  {
    name: "Cecilia, Owner",
    quote:
      "Con agenda e reminder automatici abbiamo ridotto i no-show e migliorato la giornata del team.",
    result: "-37% no-show in 2 mesi",
  },
  {
    name: "Marco, Manager",
    quote: "Ogni operatore ha una colonna chiara. Meno caos, meno errori, piu puntualita.",
    result: "+5h/sett recuperate",
  },
  {
    name: "Alessio, Multi-sede",
    quote: "Gestiamo piu sedi con ordine reale e controllo centralizzato su KPI e incassi.",
    result: "Controllo centralizzato",
  },
];

const stats = [
  { value: "-37%", label: "No-show" },
  { value: "100%", label: "Mobile Ready" },
  { value: "Multi", label: "Sede" },
  { value: "24/7", label: "Operativo" },
];

export function HomeLanding() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0.9]);
  const heroScale = useTransform(scrollYProgress, [0, 0.22], [1, 0.97]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const chipItems = useMemo(
    () => [
      "Agenda intelligente",
      "Prenotazioni online",
      "WhatsApp reminder",
      "Contabilita e KPI",
      "Multi-sede",
      "Mobile tablet desktop",
    ],
    []
  );

  return (
    <main className={`${bodyFont.className} relative min-h-screen overflow-x-clip bg-slate-950 text-slate-100`}>
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[-160px] top-[14vh] h-[400px] w-[400px] rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-[5vh] right-[-180px] h-[420px] w-[420px] rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute left-1/2 top-[28vh] h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-violet-500/15 blur-3xl" />
      </div>

      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45 }}
        className={`fixed left-3 right-3 top-3 z-50 rounded-2xl border px-3 py-2 backdrop-blur-xl sm:left-6 sm:right-6 lg:left-8 lg:right-8 ${
          isScrolled
            ? "border-white/20 bg-slate-950/80 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            : "border-white/15 bg-slate-900/50"
        }`}
      >
        <div className="mx-auto flex w-full max-w-[1360px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-12 w-36 overflow-hidden rounded-lg border border-white/20 bg-white/95 p-1 shadow-lg sm:h-14 sm:w-44">
              <Image
                src="/img/logo-grooming-revolution.png"
                alt="Grooming Revolution"
                width={640}
                height={180}
                className="h-full w-full object-contain object-center"
                priority
              />
            </div>
            <span className="hidden rounded-full border border-cyan-300/40 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-cyan-200 md:inline-flex">
              SOFTWARE PROFESSIONALE PER TOELETTATURE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
            >
              Accedi
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-3 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(14,165,233,0.35)] hover:from-cyan-400 hover:to-blue-400"
            >
              Inizia gratis
            </Link>
          </div>
        </div>
      </motion.header>

      <motion.section style={{ opacity: heroOpacity, scale: heroScale }} className="px-4 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-[1360px] items-center gap-8 pb-10 lg:grid-cols-[1.02fr_0.98fr] lg:pb-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold tracking-wide text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              Gestionale SaaS next-gen per grooming
            </p>
            <h1
              className={`${headingFont.className} mt-5 text-4xl font-bold leading-[1.02] text-white sm:text-5xl lg:text-7xl`}
            >
              Trasforma il tuo salone in un sistema operativo impeccabile.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Agenda, team, clienti, listino, prenotazioni, WhatsApp e KPI in un unico flusso.
              Meno caos, meno no-show, piu margine reale ogni settimana.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-950 hover:bg-slate-100"
              >
                Crea account gratuito
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="https://wa.me/41784104391?text=Ciao%2C%20voglio%20una%20demo%20di%20Grooming%20Revolution."
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/35 bg-emerald-500/15 px-6 py-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/25"
              >
                Prenota demo WhatsApp
              </a>
            </div>
            <div className="mt-6 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
              <p className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Gratis fino a 50 clienti
              </p>
              <p className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                20 EUR/mese + IVA oltre soglia
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            <div className="rounded-3xl border border-white/20 bg-slate-900/75 p-3 shadow-[0_25px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Agenda live</p>
                <span className="rounded bg-emerald-400/20 px-2 py-1 text-[11px] font-semibold text-emerald-200">Operativo</span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/15 bg-slate-950/70">
                <Image
                  src="/img/homepage.png"
                  alt="Preview Grooming Revolution"
                  width={1400}
                  height={880}
                  className="h-[280px] w-full object-cover object-top sm:h-[340px]"
                  priority
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-[11px] text-slate-400">{stat.label}</p>
                    <p className="text-base font-bold text-white sm:text-lg">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      <section className="px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1360px] flex-wrap gap-2">
          {chipItems.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-300"
            >
              {chip}
            </span>
          ))}
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="mx-auto w-full max-w-[1360px]">
          <div className="mb-6 text-center lg:mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-200/90">Funzionalita complete</p>
            <h2 className={`${headingFont.className} mt-2 text-3xl font-bold text-white sm:text-4xl lg:text-5xl`}>
              Tutto cio che serve, in un solo sistema.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {modules.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: idx * 0.04 }}
                  whileHover={{ y: -4 }}
                  className="group relative overflow-hidden rounded-2xl border border-white/12 bg-slate-900/65 p-5 shadow-[0_15px_45px_rgba(0,0,0,0.25)]"
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.glow} opacity-0 transition group-hover:opacity-100`} />
                  <div className="relative">
                    <div className={`inline-flex rounded-lg bg-slate-950/80 p-2 ring-1 ${item.ring}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className={`${headingFont.className} mt-4 text-2xl font-semibold text-white`}>{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.text}</p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="mx-auto grid w-full max-w-[1360px] gap-6 rounded-3xl border border-white/12 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-5 shadow-[0_20px_55px_rgba(0,0,0,0.35)] lg:grid-cols-[1fr_1fr] lg:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-200/90">Workflow operativo</p>
            <h2 className={`${headingFont.className} mt-2 text-3xl font-bold text-white sm:text-4xl`}>
              Onboarding rapido, esecuzione precisa.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
              Prima setti bene listino, team e disponibilita. Poi l&apos;agenda lavora con durata reale,
              reminder automatici e controllo completo di ogni sede.
            </p>
          </div>
          <div className="space-y-2">
            {setup.map((step, idx) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 14 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-950">
                  {idx + 1}
                </span>
                <p className="text-sm text-slate-200">{step}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="mx-auto grid w-full max-w-[1360px] gap-4 lg:grid-cols-2">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-cyan-500/15 to-blue-600/10 p-6"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-200">WhatsApp + no-show</p>
            <h3 className={`${headingFont.className} mt-2 text-3xl font-bold leading-tight text-white`}>
              Conferme e reminder automatici che proteggono il fatturato.
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-200">
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" />Template personalizzati per sede</li>
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" />Invio manuale immediato o API Meta</li>
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" />Reminder giornalieri automatici</li>
            </ul>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="rounded-3xl border border-emerald-300/20 bg-gradient-to-br from-emerald-500/15 to-teal-600/10 p-6"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">Booking online</p>
            <h3 className={`${headingFont.className} mt-2 text-3xl font-bold leading-tight text-white`}>
              Slot reali, senza overbooking e con logica professionale.
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-200">
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" />Disponibilita per turni reali operatori</li>
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" />Durata servizi per taglia e trattamenti</li>
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" />Flusso adatto anche a mobile</li>
            </ul>
          </motion.article>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="mx-auto w-full max-w-[1360px]">
          <h2 className={`${headingFont.className} text-3xl font-bold text-white sm:text-4xl lg:text-5xl`}>
            Pensato per saloni che vogliono standard pro.
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-white/12 bg-white/5 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                <Users className="h-4 w-4" />Team
              </p>
              <p className="mt-2 text-sm text-slate-200">Ruoli, turni e responsabilita definite per evitare errori operativi.</p>
            </article>
            <article className="rounded-2xl border border-white/12 bg-white/5 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                <Clock3 className="h-4 w-4" />Tempo
              </p>
              <p className="mt-2 text-sm text-slate-200">Meno tempo perso tra chat sparse, fogli e agenda non sincronizzata.</p>
            </article>
            <article className="rounded-2xl border border-white/12 bg-white/5 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                <TrendingUp className="h-4 w-4" />Crescita
              </p>
              <p className="mt-2 text-sm text-slate-200">Report e KPI per alzare performance e margine sede dopo sede.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="mx-auto w-full max-w-[1360px] rounded-3xl border border-white/12 bg-white/5 p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-200/90">Proof</p>
          <h2 className={`${headingFont.className} mt-2 text-3xl font-bold text-white sm:text-4xl`}>
            Risultati reali da chi lo usa tutti i giorni
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {testimonials.map((item, idx) => (
              <motion.article
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.06 }}
                className="rounded-2xl border border-white/10 bg-slate-900/80 p-4"
              >
                <div className="mb-2 text-amber-300">★★★★★</div>
                <p className="text-sm text-slate-200">{item.quote}</p>
                <p className="mt-3 text-sm font-bold text-white">{item.name}</p>
                <p className="mt-2 inline-flex rounded-md bg-amber-300/20 px-2 py-1 text-xs font-semibold text-amber-100">
                  {item.result}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="mx-auto w-full max-w-[1360px] rounded-3xl border border-white/12 bg-white/5 p-5 sm:p-7">
          <div className="mb-4 flex items-center gap-2">
            <Layers3 className="h-5 w-5 text-slate-200" />
            <h2 className={`${headingFont.className} text-3xl font-bold text-white sm:text-4xl`}>FAQ</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {faqs.map((item, idx) => (
              <motion.article
                key={item.q}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-2xl border border-white/10 bg-slate-900/80 p-4"
              >
                <h3 className="text-sm font-bold text-white">{item.q}</h3>
                <p className="mt-2 text-sm text-slate-300">{item.a}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="mx-auto flex w-full max-w-[1360px] flex-wrap items-end justify-between gap-6 rounded-3xl border border-cyan-300/20 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-violet-500/10 p-6 sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-100">Pricing semplice</p>
            <h2 className={`${headingFont.className} mt-2 text-3xl font-bold text-white sm:text-4xl lg:text-5xl`}>
              Gratis oggi. Fisso domani. Nessuna sorpresa.
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-200 sm:text-base">
              Parti subito senza rischio, poi paghi solo quando cresci oltre 50 clienti.
            </p>
            <ul className="mt-4 space-y-1 text-sm text-slate-200">
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" />Agenda completa e schede cliente e pet</li>
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" />Team, multi-sede, KPI e report</li>
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" />Supporto operativo e onboarding guidato</li>
            </ul>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/register"
              className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 hover:bg-slate-100"
            >
              Attiva account gratuito
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-white/25 bg-slate-900/60 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
            >
              Vai al login
            </Link>
          </div>
        </div>
      </section>

      <footer className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-[1360px] gap-6 border-t border-white/10 pt-8 md:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-white">Grooming Revolution</p>
            <p className="mt-1 text-xs text-slate-400">Software gestionale per toelettature professionali</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Navigazione</p>
            <div className="mt-1 flex flex-col gap-1 text-xs text-slate-400">
              <Link href="/login" className="hover:text-white">
                Accedi
              </Link>
              <Link href="/register" className="hover:text-white">
                Inizia gratis
              </Link>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Legale</p>
            <div className="mt-1 flex flex-col gap-1 text-xs text-slate-400">
              <Link href="/legal/privacy" className="hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/legal/terms" className="hover:text-white">
                Termini di Servizio
              </Link>
              <Link href="/legal/cookies" className="hover:text-white">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-6 w-full max-w-[1360px] text-xs text-slate-500">
          (c) {new Date().getFullYear()} Grooming Revolution. Tutti i diritti riservati.
        </p>
      </footer>
    </main>
  );
}
