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

const socialTitle = "Grooming Revolution | Gestionale per toelettatura";
const socialDescription =
  "Agenda, clienti, incassi, listino intelligente e report in un'unica piattaforma per il tuo salone.";

export const metadata: Metadata = {
  metadataBase: new URL(getMetadataBase()),
  title: {
    default: socialTitle,
    template: "%s | Grooming Revolution",
  },
  description: socialDescription,
  applicationName: "Grooming Revolution",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [{ url: "/img/logo-grooming-revolution.png", type: "image/png" }],
    shortcut: ["/img/logo-grooming-revolution.png"],
    apple: ["/img/logo-grooming-revolution.png"],
  },
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: "Grooming Revolution",
    title: socialTitle,
    description: socialDescription,
    url: "/",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Grooming Revolution - Gestionale per toelettatura",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: socialTitle,
    description: socialDescription,
    images: ["/twitter-image"],
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

