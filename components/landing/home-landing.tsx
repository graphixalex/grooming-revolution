"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
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
  },
  {
    icon: MessageCircle,
    title: "WhatsApp automatico",
    text: "Conferme e reminder immediati con template personalizzati, manuale o API.",
  },
  {
    icon: Dog,
    title: "Schede cliente + pet",
    text: "Storico completo su trattamenti, note e preferenze in un'unica scheda utile.",
  },
  {
    icon: Building2,
    title: "Gestione multi-sede",
    text: "Dati separati per sede, vista manageriale centrale quando serve decidere veloce.",
  },
  {
    icon: TrendingUp,
    title: "Report e KPI",
    text: "No-show, ritorni, incassi e performance team per decisioni concrete giornaliere.",
  },
  {
    icon: Smartphone,
    title: "Mobile-first reale",
    text: "Operativo da smartphone, tablet e desktop con stessa logica e stessa velocita.",
  },
];

const setup = [
  "Crea il listino con prezzi e durata media per taglia e servizio.",
  "Configura team, turni e giorni di apertura per ogni sede.",
  "Attiva WhatsApp per conferme e reminder automatici ai clienti.",
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
    quote: "Con agenda e reminder automatici abbiamo ridotto i no-show e migliorato la giornata del team.",
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

export function HomeLanding() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0.92]);
  const heroScale = useTransform(scrollYProgress, [0, 0.18], [1, 0.98]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 32);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className={`${bodyFont.className} pro-landing min-h-screen`}>
      <section className="pro-hero relative isolate overflow-hidden px-4 pb-8 pt-4 sm:px-6 md:px-10">
        <div className="pro-bg-grid" />
        <div className="pro-blob pro-blob-a" />
        <div className="pro-blob pro-blob-b" />
        <div className="mx-auto flex w-full max-w-[1360px] flex-col">
          <motion.header
            initial={{ y: -32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.45 }}
            className={`fixed left-4 right-4 top-3 z-50 flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 backdrop-blur md:left-10 md:right-10 md:px-5 ${
              isScrolled
                ? "border-zinc-200 bg-white/88 shadow-[0_10px_30px_rgba(15,23,42,0.12)]"
                : "border-white/40 bg-white/65"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-14 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 md:h-16 md:w-56">
                <Image
                  src="/img/logo-grooming-revolution.png"
                  alt="Grooming Revolution"
                  width={640}
                  height={180}
                  className="h-full w-full object-contain object-center"
                  priority
                />
              </div>
              <span className="hidden rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-cyan-700 md:inline-flex">
                SOFTWARE PROFESSIONALE PER TOELETTATURE
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/login" className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
                Accedi
              </Link>
              <Link href="/register" className="rounded-xl bg-[#ff7a18] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(255,122,24,0.35)] hover:bg-[#ea6f16]">
                Inizia gratis
              </Link>
            </div>
          </motion.header>

          <motion.div
            style={{ opacity: heroOpacity, scale: heroScale }}
            className="grid items-center gap-6 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:py-16"
          >
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative z-10"
            >
              <p className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-xs font-bold text-zinc-700">
                <Sparkles className="h-3.5 w-3.5 text-[#ff7a18]" />
                Gestionale SaaS next-gen per grooming
              </p>
              <h1 className={`${headingFont.className} mt-4 text-4xl font-bold leading-[1.02] tracking-tight text-zinc-950 sm:text-5xl lg:text-7xl`}>
                Trasforma il tuo salone in un sistema operativo impeccabile.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-700 md:text-lg">
                Agenda, team, clienti, listino, prenotazioni, WhatsApp e KPI in un unico flusso.
                Meno caos, meno no-show, piu margine reale ogni settimana.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800">
                  Crea account gratuito
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="https://wa.me/41784104391?text=Ciao%2C%20voglio%20una%20demo%20di%20Grooming%20Revolution."
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                >
                  Prenota demo WhatsApp
                </a>
              </div>
              <div className="mt-6 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
                <p className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Gratis fino a 50 clienti</p>
                <p className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />20 EUR/mese + IVA oltre soglia</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative z-10"
            >
              <div className="pro-device">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Agenda live</p>
                  <span className="rounded bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">Operativo</span>
                </div>
                <div className="space-y-2">
                  <div className="rounded-xl border border-zinc-200 bg-white p-3">
                    <p className="text-xs text-zinc-500">Lunedi 11:00 - 13:00</p>
                    <p className="mt-1 text-sm font-bold text-zinc-900">Pippo / Alessio</p>
                    <p className="text-xs text-zinc-600">Bagno + Taglio - conferma inviata</p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-white p-3">
                    <p className="text-xs text-zinc-500">Martedi 10:30 - 12:00</p>
                    <p className="mt-1 text-sm font-bold text-zinc-900">Luna / Cecilia</p>
                    <p className="text-xs text-zinc-600">Trattamento completo - reminder scheduled</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-zinc-900 px-3 py-2 text-white">
                    <p className="text-[11px] text-zinc-300">No-show</p>
                    <p className="text-lg font-bold">-37%</p>
                  </div>
                  <div className="rounded-lg bg-cyan-100 px-3 py-2 text-cyan-800">
                    <p className="text-[11px]">Team</p>
                    <p className="text-lg font-bold">SYNC</p>
                  </div>
                  <div className="rounded-lg bg-amber-100 px-3 py-2 text-amber-800">
                    <p className="text-[11px]">Reminder</p>
                    <p className="text-lg font-bold">AUTO</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="w-full border-y border-zinc-200 bg-white/70 px-4 py-4 sm:px-6 md:px-10">
        <div className="mx-auto flex w-full max-w-[1360px] flex-wrap gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-600">
          <span className="rounded-full border border-zinc-200 bg-white px-3 py-1">Agenda intelligente</span>
          <span className="rounded-full border border-zinc-200 bg-white px-3 py-1">Prenotazioni online</span>
          <span className="rounded-full border border-zinc-200 bg-white px-3 py-1">WhatsApp reminder</span>
          <span className="rounded-full border border-zinc-200 bg-white px-3 py-1">Contabilita e KPI</span>
          <span className="rounded-full border border-zinc-200 bg-white px-3 py-1">Multi-sede</span>
          <span className="rounded-full border border-zinc-200 bg-white px-3 py-1">Mobile tablet desktop</span>
        </div>
      </section>

      <section className="px-4 py-6 sm:px-6 md:px-10 md:py-8">
        <div className="mx-auto w-full max-w-[1360px]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            className="pro-showcase-frame"
          >
            <div className="pro-showcase-glow" />
            <div className="pro-showcase-inner">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Hero Showcase
              </p>
              <div className="pro-showcase-image-wrap">
                <Image
                  src="/img/logo-grooming-revolution.png"
                  alt="Showcase Grooming Revolution"
                  width={1400}
                  height={780}
                  className="pro-showcase-image"
                  priority
                />
                <div className="pro-showcase-overlay">
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/80">Sostituisci con immagine hero finale</p>
                  <p className="mt-1 text-sm font-semibold text-white">Inserire qui screenshot prodotto o visual marketing premium</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 md:px-10 md:py-12">
        <div className="mx-auto w-full max-w-[1360px]">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Funzionalita complete</p>
              <h2 className={`${headingFont.className} mt-1 text-3xl font-bold text-zinc-900 md:text-5xl`}>
                Tutto cio che serve, in un solo sistema.
              </h2>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {modules.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ delay: idx * 0.04 }}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.07)]"
                >
                  <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                    <Icon className="h-5 w-5 text-zinc-700" />
                  </div>
                  <h3 className={`${headingFont.className} mt-3 text-xl font-bold text-zinc-900`}>{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-700">{item.text}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="w-full bg-zinc-950 px-4 py-10 text-zinc-100 sm:px-6 md:px-10 md:py-12">
        <div className="mx-auto grid w-full max-w-[1360px] gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Workflow operativo</p>
            <h2 className={`${headingFont.className} mt-2 text-3xl font-bold leading-tight md:text-5xl`}>
              Onboarding rapido, esecuzione precisa.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300 md:text-base">
              Parti con una logica chiara, poi gestisci tutta la giornata con flussi coerenti per owner, manager e staff.
            </p>
          </div>
          <div className="space-y-2">
            {setup.map((step, idx) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-zinc-900">{idx + 1}</span>
                <p className="text-sm text-zinc-200">{step}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 md:px-10 md:py-12">
        <div className="mx-auto grid w-full max-w-[1360px] gap-4 lg:grid-cols-2">
          <motion.article initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-5 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">WhatsApp + no-show</p>
            <h3 className={`${headingFont.className} mt-2 text-3xl font-bold leading-tight text-zinc-900 md:text-4xl`}>
              Conferme e reminder automatici che proteggono il fatturato.
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-zinc-700">
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Template personalizzati per sede</li>
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Invio manuale immediato o API Meta</li>
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Reminder giornalieri automatici</li>
            </ul>
          </motion.article>
          <motion.article initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.08 }} className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Booking online</p>
            <h3 className={`${headingFont.className} mt-2 text-3xl font-bold leading-tight text-zinc-900 md:text-4xl`}>
              Slot reali, senza overbooking e con logica professionale.
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-zinc-700">
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Disponibilita per turni reali operatori</li>
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Durata servizi per taglia e trattamenti</li>
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Flusso adatto anche a mobile</li>
            </ul>
          </motion.article>
        </div>
      </section>

      <section className="w-full bg-white px-4 py-10 sm:px-6 md:px-10 md:py-12">
        <div className="mx-auto w-full max-w-[1360px]">
          <h2 className={`${headingFont.className} text-3xl font-bold text-zinc-900 md:text-5xl`}>
            Pensato per saloni che vogliono standard pro.
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500"><Users className="h-4 w-4" />Team</p>
              <p className="mt-2 text-sm text-zinc-700">Ruoli, turni e responsabilita definite per evitare errori operativi.</p>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500"><Clock3 className="h-4 w-4" />Tempo</p>
              <p className="mt-2 text-sm text-zinc-700">Meno tempo perso tra chat sparse, fogli e agenda non sincronizzata.</p>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500"><TrendingUp className="h-4 w-4" />Crescita</p>
              <p className="mt-2 text-sm text-zinc-700">Report e KPI per alzare performance e margine sede dopo sede.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 md:px-10 md:py-12">
        <div className="mx-auto w-full max-w-[1360px] rounded-3xl border border-zinc-200 bg-white p-5 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Proof</p>
          <h2 className={`${headingFont.className} mt-2 text-3xl font-bold text-zinc-900 md:text-4xl`}>
            Risultati reali da chi lo usa tutti i giorni
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {testimonials.map((item, idx) => (
              <motion.article
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
              >
                <div className="mb-2 text-amber-500">★★★★★</div>
                <p className="text-sm text-zinc-700">{item.quote}</p>
                <p className="mt-3 text-sm font-bold text-zinc-900">{item.name}</p>
                <p className="mt-2 inline-flex rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-zinc-800">{item.result}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 md:px-10 md:py-12">
        <div className="mx-auto w-full max-w-[1360px] rounded-3xl border border-zinc-200 bg-white p-5 md:p-8">
          <div className="mb-4 flex items-center gap-2">
            <Layers3 className="h-5 w-5 text-zinc-700" />
            <h2 className={`${headingFont.className} text-3xl font-bold text-zinc-900 md:text-4xl`}>FAQ</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {faqs.map((item, idx) => (
              <motion.article
                key={item.q}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.04 }}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
              >
                <h3 className="text-sm font-bold text-zinc-900">{item.q}</h3>
                <p className="mt-2 text-sm text-zinc-700">{item.a}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100 px-4 py-10 sm:px-6 md:px-10 md:py-12">
        <div className="mx-auto flex w-full max-w-[1360px] flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-700">Pricing semplice</p>
            <h2 className={`${headingFont.className} mt-1 text-3xl font-bold text-zinc-900 md:text-5xl`}>
              Gratis oggi. Fisso domani. Nessuna sorpresa.
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-700 md:text-base">
              Parti subito senza rischio, poi paghi solo quando cresci oltre 50 clienti.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-zinc-700">
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700" />Agenda completa e schede cliente e pet</li>
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700" />Team, multi-sede, KPI e report</li>
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700" />Supporto operativo e onboarding guidato</li>
            </ul>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/register" className="rounded-xl bg-[#ff7a18] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(255,122,24,0.3)] hover:bg-[#ea6f16]">
              Attiva account gratuito
            </Link>
            <Link href="/login" className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
              Vai al login
            </Link>
          </div>
        </div>
      </section>

      <footer className="w-full bg-zinc-950 px-4 py-8 text-zinc-200 sm:px-6 md:px-10">
        <div className="mx-auto grid w-full max-w-[1360px] gap-6 md:grid-cols-3">
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
        <p className="mx-auto mt-6 w-full max-w-[1360px] text-xs text-zinc-500">(c) {new Date().getFullYear()} Grooming Revolution. Tutti i diritti riservati.</p>
      </footer>
    </main>
  );
}
