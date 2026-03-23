"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Manrope, Sora } from "next/font/google";
import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion";
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
  Zap,
  Star,
  Rocket,
  Shield,
  Target,
} from "lucide-react";

const headingFont = Sora({ subsets: ["latin"], weight: ["500", "700", "800"] });
const bodyFont = Manrope({ subsets: ["latin"], weight: ["400", "500", "700"] });

const modules = [
  {
    icon: CalendarDays,
    title: "Agenda multi-operatore",
    text: "Blocchi appuntamento reali, drag and drop e controllo turni senza confusione.",
    ring: "ring-cyan-300/60",
    glow: "from-cyan-500/10 to-blue-500/10",
    color: "cyan",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp automatico",
    text: "Conferme e reminder immediati con template personalizzati, manuale o API.",
    ring: "ring-emerald-300/60",
    glow: "from-emerald-500/10 to-green-500/10",
    color: "emerald",
  },
  {
    icon: Dog,
    title: "Schede cliente + pet",
    text: "Storico completo su trattamenti, note e preferenze in un'unica scheda utile.",
    ring: "ring-fuchsia-300/60",
    glow: "from-fuchsia-500/10 to-pink-500/10",
    color: "fuchsia",
  },
  {
    icon: Building2,
    title: "Gestione multi-sede",
    text: "Dati separati per sede, vista manageriale centrale quando serve decidere veloce.",
    ring: "ring-orange-300/60",
    glow: "from-orange-500/10 to-amber-500/10",
    color: "orange",
  },
  {
    icon: TrendingUp,
    title: "Report e KPI",
    text: "No-show, ritorni, incassi e performance team per decisioni concrete giornaliere.",
    ring: "ring-yellow-300/60",
    glow: "from-yellow-500/10 to-amber-500/10",
    color: "yellow",
  },
  {
    icon: Smartphone,
    title: "Mobile-first reale",
    text: "Operativo da smartphone, tablet e desktop con stessa logica e stessa velocita.",
    ring: "ring-indigo-300/60",
    glow: "from-indigo-500/10 to-violet-500/10",
    color: "indigo",
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

// Componente per le particelle animate
function AnimatedParticles() {
  const [particles, setParticles] = useState<Array<{ x: number; y: number; tx: number; ty: number; d: number }>>([]);

  useEffect(() => {
    const width = typeof window !== "undefined" ? window.innerWidth : 1920;
    const height = typeof window !== "undefined" ? window.innerHeight : 1080;
    setParticles(
      Array.from({ length: 30 }, () => {
        const x = Math.random() * width;
        const y = Math.random() * height;
        return {
          x,
          y,
          tx: Math.random() * width,
          ty: Math.random() * height,
          d: Math.random() * 10 + 10,
        };
      })
    );
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full opacity-20"
          initial={{
            x: p.x,
            y: p.y,
          }}
          animate={{
            x: p.tx,
            y: p.ty,
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: p.d,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

// Counter animato
function AnimatedCounter({ value }: { value: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const numericValue = parseInt(value.replace(/\D/g, "")) || 100;
      const duration = 2000;
      const steps = 60;
      const increment = numericValue / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= numericValue) {
          setCount(numericValue);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return <span ref={ref}>{value.includes("%") ? `${count}%` : value}</span>;
}

export function HomeLanding() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0.95]);
  const heroScale = useTransform(scrollYProgress, [0, 0.25], [1, 0.97]);
  const smoothScrollYProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("mousemove", handleMouseMove);
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <main className={`${bodyFont.className} relative min-h-screen overflow-x-clip bg-gradient-to-b from-[#f8fbff] via-[#f5f8fd] to-[#f6f8fc] text-zinc-900`}>
      <motion.div
        className="fixed left-0 right-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400"
        style={{ scaleX: smoothScrollYProgress }}
      />
      {/* Background Animato Ultra Avanzato */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        {/* Gradient radiali multipli */}
        <motion.div
          className="absolute left-[-10%] top-[5%] h-[600px] w-[600px] rounded-full bg-cyan-300/35 blur-[120px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-[10%] right-[-5%] h-[700px] w-[700px] rounded-full bg-orange-300/30 blur-[120px]"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.25, 0.4, 0.25],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-300/20 blur-[100px]"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.2, 0.35, 0.2],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Grid animato */}
        <div 
          className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a0f_1px,transparent_1px),linear-gradient(to_bottom,#0f172a0f_1px,transparent_1px)] bg-[size:64px_64px] opacity-35"
          style={{
            transform: `perspective(1000px) rotateX(60deg) translateY(-50%)`,
            transformOrigin: "center top",
          }}
        />
        
        {/* Particelle animate */}
        <AnimatedParticles />
        
        {/* Effetto mouse glow */}
        <motion.div
          className="absolute h-96 w-96 rounded-full bg-cyan-300/30 blur-3xl"
          animate={{
            x: mousePosition.x - 200,
            y: mousePosition.y - 200,
          }}
          transition={{
            type: "spring",
            damping: 50,
            stiffness: 200,
          }}
        />
      </div>

      {/* Header con glassmorphism ultra */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed left-4 right-4 top-4 z-50 rounded-3xl border px-4 py-3 backdrop-blur-2xl sm:left-6 sm:right-6 lg:left-8 lg:right-8 transition-all duration-300 ${
          isScrolled
            ? "border-zinc-200 bg-white/95 shadow-[0_20px_80px_rgba(15,23,42,0.14)]"
            : "border-white/60 bg-white/85"
        }`}
      >
        <div className="mx-auto grid w-full max-w-[1400px] grid-cols-[auto_1fr_auto] items-center gap-4">
          <div className="hidden items-center xl:flex">
            <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-4 py-1.5 text-[11px] font-bold tracking-wide text-cyan-700">
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              SOFTWARE PROFESSIONALE NEXT-GEN
            </span>
          </div>

          <motion.div className="justify-self-center" whileHover={{ scale: 1.02 }}>
            <div className="relative h-14 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white p-2 shadow sm:h-16 sm:w-64">
              <Image
                src="/img/logo-grooming-revolution.png"
                alt="Grooming Revolution"
                width={640}
                height={180}
                className="h-full w-full object-contain object-center"
                priority
              />
            </div>
          </motion.div>

          <div className="flex items-center gap-3 justify-self-end">
            <Link
              href="/login"
              className="whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition-all hover:scale-105 hover:bg-zinc-50"
            >
              Accedi
            </Link>
            <Link
              href="/register"
              className="whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition-all hover:scale-105 hover:bg-zinc-50"
            >
              Registrati
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Hero Section ESPLOSIVA */}
      <motion.section 
        style={{ opacity: heroOpacity, scale: heroScale }} 
        className="relative px-4 pt-32 sm:px-6 lg:px-8 lg:pt-40"
      >
        <div className="mx-auto w-full max-w-[1400px]">
          {/* Badge con animazione */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="flex justify-center"
          >
            <motion.div
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 px-5 py-2 backdrop-blur-xl"
              animate={{
                boxShadow: [
                  "0 0 30px rgba(34, 211, 238, 0.3)",
                  "0 0 50px rgba(34, 211, 238, 0.6)",
                  "0 0 30px rgba(34, 211, 238, 0.3)",
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
            >
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-xs font-extrabold tracking-wide text-transparent">
                🚀 GROOMING REVOLUTION 2026
              </span>
              <Star className="h-4 w-4 text-purple-400" />
            </motion.div>
          </motion.div>

          {/* Titolo MEGA con effetto gradiente animato */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className={`${headingFont.className} relative mt-8 text-center text-5xl font-black leading-[1.05] sm:text-6xl lg:text-8xl`}
          >
            <motion.span
              className="block bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                backgroundSize: "200% 200%",
              }}
            >
              Trasforma il tuo salone
            </motion.span>
            <motion.span
              className="mt-2 block bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "linear",
                delay: 0.5,
              }}
              style={{
                backgroundSize: "200% 200%",
              }}
            >
              in una macchina perfetta
            </motion.span>
            
            {/* Effetto glow sotto il titolo */}
            <motion.div
              className="absolute -bottom-4 left-1/2 h-32 w-full -translate-x-1/2 bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-purple-500/30 blur-3xl"
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [0.9, 1.1, 0.9],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
              }}
            />
          </motion.h1>

          {/* Sottotitolo epico */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mx-auto mt-10 max-w-3xl text-center text-lg leading-relaxed text-zinc-700 sm:text-xl lg:text-2xl"
          >
            <span className="font-bold text-cyan-400">Agenda intelligente</span>, team sincronizzato,{" "}
            <span className="font-bold text-purple-400">WhatsApp automatico</span> e{" "}
            <span className="font-bold text-orange-400">KPI in tempo reale</span>.
            <br />
            <span className="text-zinc-600">Meno caos. Piu controllo. Piu guadagno.</span>
          </motion.p>

          {/* CTA Buttons ULTRA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-12 flex flex-wrap justify-center gap-4"
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                href="/register"
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-zinc-950 px-10 py-5 text-lg font-black text-white shadow-[0_18px_35px_rgba(15,23,42,0.2)] transition-all hover:bg-zinc-800"
              >
                <Rocket className="h-6 w-6 transition-transform group-hover:rotate-12" />
                <span className="relative z-10">INIZIA GRATIS ORA</span>
                <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <a
                href="https://wa.me/41784104391?text=Ciao%2C%20voglio%20una%20demo%20di%20Grooming%20Revolution!"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-10 py-5 text-lg font-bold text-emerald-700 transition-all hover:border-emerald-400 hover:bg-emerald-100"
              >
                <MessageCircle className="h-6 w-6" />
                Demo WhatsApp
              </a>
            </motion.div>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-zinc-600"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-cyan-400" />
              <span><strong className="text-cyan-400">Gratis</strong> fino a 50 clienti</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-400" />
              <span><strong className="text-purple-400">20€/mese</strong> oltre soglia</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span><strong className="text-emerald-400">Setup in 10 minuti</strong></span>
            </div>
          </motion.div>

          {/* Screenshot con effetto 3D WOW */}
          <motion.div
            initial={{ opacity: 0, y: 60, rotateX: 15 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1, delay: 1 }}
            className="relative mx-auto mt-20 max-w-6xl"
            style={{
              perspective: "2000px",
            }}
          >
            <motion.div
              className="relative rounded-3xl border border-zinc-200 bg-white p-4 shadow-[0_30px_80px_rgba(15,23,42,0.14)]"
              whileHover={{
                rotateY: 2,
                rotateX: -2,
                scale: 1.02,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
            >
              {/* Top bar mockup */}
              <div className="mb-4 flex items-center justify-between rounded-t-2xl border-b border-zinc-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    Dashboard Live • Operativo
                  </span>
                </div>
                <motion.span 
                  className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200"
                  animate={{
                    boxShadow: [
                      "0 0 10px rgba(16, 185, 129, 0.3)",
                      "0 0 20px rgba(16, 185, 129, 0.6)",
                      "0 0 10px rgba(16, 185, 129, 0.3)",
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                >
                  ● ONLINE
                </motion.span>
              </div>

              {/* Screenshot */}
              <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
                <Image
                  src="/img/homepage.png"
                  alt="Preview Grooming Revolution"
                  width={1400}
                  height={880}
                  className="h-[400px] w-full object-cover object-top sm:h-[500px] lg:h-[600px]"
                  priority
                />
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/45 via-transparent to-transparent pointer-events-none" />
                
                {/* Floating stats */}
                <motion.div
                  className="absolute bottom-6 left-6 rounded-2xl border border-cyan-200 bg-white/90 p-4 backdrop-blur-xl"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.5 }}
                >
                  <div className="text-xs text-zinc-600">No-show ridotti</div>
                  <div className="text-3xl font-black text-cyan-400">
                    <AnimatedCounter value="-37%" />
                  </div>
                </motion.div>

                <motion.div
                  className="absolute bottom-6 right-6 rounded-2xl border border-violet-200 bg-white/90 p-4 backdrop-blur-xl"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.7 }}
                >
                  <div className="text-xs text-zinc-600">Tempo risparmiato</div>
                  <div className="text-3xl font-black text-purple-400">+5h/sett</div>
                </motion.div>
              </div>

              {/* Stats grid sotto */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.map((stat, idx) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 + idx * 0.1 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 backdrop-blur-sm"
                  >
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">{stat.label}</div>
                    <div className="mt-1 text-2xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                      <AnimatedCounter value={stat.value} />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Glow effect */}
              <motion.div
                className="absolute -inset-px rounded-3xl bg-gradient-to-r from-cyan-500/50 via-purple-500/50 to-pink-500/50 opacity-0 blur-xl"
                animate={{
                  opacity: [0, 0.5, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                }}
              />
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section con Cards 3D */}
      <section className="relative px-4 py-32 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1400px]">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-16 text-center"
          >
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-cyan-400 backdrop-blur-xl">
              <Layers3 className="h-4 w-4" />
              Funzionalità Complete
            </p>
            <h2 className={`${headingFont.className} mt-6 text-4xl font-black text-zinc-900 sm:text-5xl lg:text-6xl`}>
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Tutto in un solo sistema.
              </span>
              <br />
              <span className="text-zinc-700">Nessun compromesso.</span>
            </h2>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {modules.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: idx * 0.1, duration: 0.6 }}
                  whileHover={{
                    y: -8,
                    rotateY: 5,
                    rotateX: 5,
                  }}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white p-8 shadow-[0_12px_35px_rgba(15,23,42,0.08)]"
                  style={{
                    perspective: "1000px",
                  }}
                >
                  {/* Glow animato al hover */}
                  <motion.div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.glow} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
                  />
                  
                  {/* Border glow */}
                  <div className={`absolute -inset-px rounded-3xl bg-gradient-to-r ${item.glow} opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100`} />

                  <div className="relative z-10">
                    {/* Icon con effetto */}
                    <motion.div
                      className={`inline-flex rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 ring-2 ${item.ring} shadow-lg`}
                      whileHover={{
                        rotate: [0, -10, 10, -10, 0],
                        scale: 1.1,
                      }}
                      transition={{
                        duration: 0.5,
                      }}
                    >
                      <Icon className="h-7 w-7 text-white drop-shadow-lg" />
                    </motion.div>

                    <h3 className={`${headingFont.className} mt-6 text-2xl font-bold text-zinc-900`}>
                      {item.title}
                    </h3>
                    <p className="mt-3 text-base leading-relaxed text-zinc-600">
                      {item.text}
                    </p>

                    {/* Arrow indicator */}
                    <motion.div
                      className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-400 opacity-0 transition-opacity group-hover:opacity-100"
                      initial={{ x: -10 }}
                      whileHover={{ x: 0 }}
                    >
                      Scopri di più
                      <ArrowRight className="h-4 w-4" />
                    </motion.div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Setup/Onboarding Section */}
      <section className="relative px-4 py-32 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-[1400px] gap-12 rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-[0_16px_45px_rgba(15,23,42,0.1)] lg:grid-cols-[1fr_1.2fr] lg:p-16">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <p className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-orange-400 backdrop-blur-xl">
              <Zap className="h-4 w-4" />
              Setup Lampo
            </p>
            <h2 className={`${headingFont.className} mt-6 text-4xl font-black text-zinc-900 sm:text-5xl`}>
              Da zero a operativo
              <br />
              <span className="bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
                in 10 minuti.
              </span>
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-zinc-700">
              Non serve essere esperti. Il sistema ti guida passo-passo:
              listino, team, turni e sei pronto a ricevere prenotazioni.
            </p>

            <motion.div
              className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-4"
              whileHover={{ scale: 1.05 }}
            >
              <Clock3 className="h-8 w-8 text-cyan-400" />
              <div>
                <div className="text-sm text-zinc-600">Tempo medio setup</div>
                <div className="text-2xl font-black text-zinc-900">10 min</div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-4"
          >
            {setup.map((step, idx) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                whileHover={{
                  scale: 1.02,
                  x: 10,
                }}
                className="flex items-start gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 transition-all hover:border-cyan-300 hover:bg-white"
              >
                <motion.span
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-lg font-black text-white shadow-lg"
                  whileHover={{
                    rotate: 360,
                    scale: 1.2,
                  }}
                  transition={{
                    duration: 0.5,
                  }}
                >
                  {idx + 1}
                </motion.span>
                <p className="pt-1 text-base leading-relaxed text-zinc-700">{step}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Booking online clienti */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-[1400px] gap-6 rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-[0_16px_45px_rgba(15,23,42,0.1)] lg:grid-cols-2 lg:p-10">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50 p-6"
          >
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-700">
              <CalendarDays className="h-4 w-4" />
              Booking online
            </p>
            <h3 className={`${headingFont.className} mt-3 text-3xl font-bold text-zinc-900`}>
              Prenotazioni clienti sicure e sotto controllo
            </h3>
            <p className="mt-3 text-base leading-relaxed text-zinc-700">
              Ogni prenotazione passa da regole reali: durata servizio, taglia, disponibilita operatore,
              sede attiva e orari consentiti. Niente slot incoerenti, niente overbooking nascosto.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-zinc-700">
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Slot filtrati per sede e operatore</li>
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Durate prese dal listino reale</li>
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Conferme WhatsApp automatiche post-prenotazione</li>
            </ul>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6"
          >
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-700">
              <Shield className="h-4 w-4" />
              Logica protetta
            </p>
            <h3 className={`${headingFont.className} mt-3 text-3xl font-bold text-zinc-900`}>
              Flusso anti-errori per prenotazioni da clienti
            </h3>
            <p className="mt-3 text-base leading-relaxed text-zinc-700">
              Il booking evita collisioni con orari non validi e tutela il calendario operativo. Se hai
              gia una base clienti, il team puo importarla per partire senza reinserimenti manuali.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-zinc-700">
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Blocchi non prenotabili fuori orario</li>
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Allineamento con agenda interna in tempo reale</li>
              <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Reminder automatici prima dell&apos;appuntamento</li>
            </ul>
          </motion.article>
        </div>
      </section>

      {/* Social Proof / Testimonials */}
      <section className="relative px-4 py-32 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1400px]">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-emerald-400 backdrop-blur-xl">
              <Star className="h-4 w-4 fill-emerald-400" />
              Testimonianze
            </p>
            <h2 className={`${headingFont.className} mt-6 text-4xl font-black text-zinc-900 sm:text-5xl lg:text-6xl`}>
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Risultati reali.
              </span>
              <br />
              <span className="text-zinc-700">Clienti soddisfatti.</span>
            </h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((item, idx) => (
              <motion.article
                key={item.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15, duration: 0.6 }}
                whileHover={{
                  y: -12,
                  scale: 1.03,
                }}
                className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-8 shadow-[0_12px_35px_rgba(15,23,42,0.08)]"
              >
                {/* Stars */}
                <div className="mb-6 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.15 + i * 0.1 }}
                    >
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    </motion.div>
                  ))}
                </div>

                <p className="text-lg leading-relaxed text-zinc-700">&ldquo;{item.quote}&rdquo;</p>

                <div className="mt-6 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-zinc-900">{item.name}</p>
                  </div>
                  <motion.span
                    className="rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 px-4 py-2 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/40"
                    whileHover={{ scale: 1.1 }}
                  >
                    {item.result}
                  </motion.span>
                </div>

                {/* Glow */}
                <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-emerald-500/30 via-teal-500/30 to-cyan-500/30 opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative px-4 py-32 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1400px]">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className={`${headingFont.className} text-4xl font-black text-zinc-900 sm:text-5xl`}>
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Domande frequenti
              </span>
            </h2>
          </motion.div>

          <div className="grid gap-5 md:grid-cols-2">
            {faqs.map((item, idx) => (
              <motion.article
                key={item.q}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className="rounded-3xl border border-zinc-200 bg-white p-8 transition-all hover:border-cyan-300 hover:bg-cyan-50/30"
              >
                <h3 className="text-xl font-bold text-zinc-900">{item.q}</h3>
                <p className="mt-4 text-base leading-relaxed text-zinc-700">{item.a}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA ESPLOSIVA */}
      <section className="relative px-4 py-32 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative mx-auto w-full max-w-[1400px] overflow-hidden rounded-[40px] border border-white/20 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 p-12 backdrop-blur-2xl lg:p-20"
        >
          {/* Background effects */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.1),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.15),transparent_50%)]" />

          <div className="relative z-10 text-center">
            <motion.p
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/20 px-5 py-2 text-xs font-bold uppercase tracking-widest text-cyan-400 backdrop-blur-xl"
              animate={{
                boxShadow: [
                  "0 0 20px rgba(34, 211, 238, 0.4)",
                  "0 0 40px rgba(34, 211, 238, 0.7)",
                  "0 0 20px rgba(34, 211, 238, 0.4)",
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            >
              <Sparkles className="h-4 w-4" />
              Ultima chiamata
            </motion.p>

            <h2 className={`${headingFont.className} mt-8 text-5xl font-black text-zinc-900 sm:text-6xl lg:text-7xl`}>
              Pronto a dominare
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                il tuo settore?
              </span>
            </h2>

            <p className="mx-auto mt-8 max-w-3xl text-xl leading-relaxed text-zinc-700 sm:text-2xl">
              Unisciti a centinaia di saloni che hanno trasformato il loro business.
              <br />
              <strong className="text-zinc-900">Inizia gratis oggi. Nessuna carta richiesta.</strong>
            </p>

            <div className="mt-12 flex flex-wrap justify-center gap-5">
              <motion.div
                whileHover={{ scale: 1.08, y: -4 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/register"
                  className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 px-12 py-6 text-xl font-black text-white shadow-[0_0_80px_rgba(34,211,238,0.6)] transition-all hover:shadow-[0_0_120px_rgba(34,211,238,0.9)]"
                >
                  <Rocket className="h-7 w-7 transition-transform group-hover:rotate-12" />
                  <span className="relative z-10">INIZIA GRATIS</span>
                  <ArrowRight className="h-7 w-7 transition-transform group-hover:translate-x-2" />
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.6 }}
                  />
                </Link>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.08, y: -4 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/login"
                  className="inline-flex items-center gap-3 rounded-2xl border-2 border-zinc-300 bg-white px-12 py-6 text-xl font-bold text-zinc-900 transition-all hover:border-zinc-400 hover:bg-zinc-50"
                >
                  Accedi
                </Link>
              </motion.div>
            </div>

            <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-zinc-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span>Setup immediato</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span>Supporto 24/7</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span>Disdici quando vuoi</span>
              </div>
            </div>
          </div>

          {/* Animated glow border */}
          <motion.div
            className="absolute -inset-px rounded-[40px] bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-50 blur-2xl"
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
            }}
          />
        </motion.div>
      </section>

      {/* Footer minimale ma elegante */}
      <footer className="relative border-t border-zinc-200 bg-white/70 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-[1400px] gap-10 md:grid-cols-3">
          <div>
            <div className="h-12 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white p-2">
              <Image
                src="/img/logo-grooming-revolution.png"
                alt="Grooming Revolution"
                width={640}
                height={180}
                className="h-full w-full object-contain"
              />
            </div>
            <p className="mt-4 text-sm text-zinc-600">
              Il gestionale SaaS professionale
              <br />
              per toelettature moderne.
            </p>
          </div>

          <div>
            <p className="font-bold text-zinc-900">Navigazione</p>
            <div className="mt-4 flex flex-col gap-2 text-sm text-zinc-600">
              <Link href="/login" className="transition-colors hover:text-cyan-400">
                Accedi
              </Link>
              <Link href="/register" className="transition-colors hover:text-cyan-400">
                Inizia gratis
              </Link>
            </div>
          </div>

          <div>
            <p className="font-bold text-zinc-900">Legale</p>
            <div className="mt-4 flex flex-col gap-2 text-sm text-zinc-600">
              <Link href="/legal/privacy" className="transition-colors hover:text-cyan-400">
                Privacy Policy
              </Link>
              <Link href="/legal/terms" className="transition-colors hover:text-cyan-400">
                Termini di Servizio
              </Link>
              <Link href="/legal/cookies" className="transition-colors hover:text-cyan-400">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-12 w-full max-w-[1400px] text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Grooming Revolution. Tutti i diritti riservati.
        </p>
      </footer>
    </main>
  );
}
