import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

function getMetadataBase() {
  const explicitUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (explicitUrl) return explicitUrl;

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return `https://${vercelProd}`;

  const vercelPreview = process.env.VERCEL_URL;
  if (vercelPreview) return `https://${vercelPreview}`;

  return "http://localhost:3000";
}

const siteName = "Grooming Revolution";
const socialTitle = "Grooming Revolution | Gestionale SaaS per Toelettatura";
const socialDescription =
  "Gestionale SaaS per toelettatori: agenda multi-operatore, clienti e pet, booking online, incassi, WhatsApp e report KPI.";

export const metadata: Metadata = {
  metadataBase: new URL(getMetadataBase()),
  title: {
    default: socialTitle,
    template: `%s | ${siteName}`,
  },
  description: socialDescription,
  keywords: [
    "gestionale toelettatura",
    "software toelettatura cani",
    "agenda toelettatura",
    "gestionale salone cani",
    "booking toelettatura",
    "SaaS toelettatori",
  ],
  applicationName: siteName,
  category: "business",
  creator: siteName,
  publisher: siteName,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/img/favicon.ico" },
      { url: "/img/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/img/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: ["/img/favicon.ico"],
    apple: [{ url: "/img/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName,
    title: socialTitle,
    description: socialDescription,
    url: "/",
    images: [
      {
        url: "/img/per-homepage.png?v=20260324",
        width: 1200,
        height: 630,
        alt: "Grooming Revolution - Dashboard preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: socialTitle,
    description: socialDescription,
    images: ["/img/per-homepage.png?v=20260324"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body className="min-h-screen overflow-x-hidden bg-zinc-50 text-zinc-900 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

