import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { HomeLanding } from "@/components/landing/home-landing";
import { authOptions } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gestionale Per Toelettatura Cani",
  description:
    "Grooming Revolution: gestionale SaaS per saloni di toelettatura con agenda, clienti, booking online, WhatsApp e report KPI.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Grooming Revolution | Gestionale SaaS per Toelettatura",
    description:
      "Agenda multi-operatore, schede clienti e pet, booking online, incassi e report in una piattaforma unica.",
    url: "/",
  },
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Grooming Revolution",
    url: "https://grooming-revolution.com/",
    inLanguage: "it-IT",
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Grooming Revolution",
    url: "https://grooming-revolution.com/",
    logo: "https://grooming-revolution.com/img/logo-grooming-revolution.png",
    contactPoint: [
      {
        "@type": "ContactPoint",
        email: "servizioclienti@grooming-revolution.com",
        contactType: "customer support",
        availableLanguage: ["Italian"],
      },
    ],
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Grooming Revolution",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "20.00",
      priceCurrency: "EUR",
      description: "Piano FULL mensile oltre soglia trial",
    },
    description:
      "Gestionale SaaS per toelettatura: agenda, clienti e pet, booking online, WhatsApp e report.",
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Quanto costa il gestionale?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Gratis fino a 50 clienti. Oltre i 50 clienti il piano FULL e 20 EUR/mese più imposte applicabili.",
        },
      },
      {
        "@type": "Question",
        name: "Posso usarlo da telefono?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Si, l'interfaccia è progettata per uso operativo quotidiano anche da smartphone.",
        },
      },
      {
        "@type": "Question",
        name: "Gestisce più sedi?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Si, ogni sede mantiene dati separati con controllo aggregato per owner e manager.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <HomeLanding />
    </>
  );
}

