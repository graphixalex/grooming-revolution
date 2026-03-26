import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">{children}</main>;
}

