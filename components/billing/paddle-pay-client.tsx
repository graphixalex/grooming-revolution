"use client";

import Script from "next/script";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (value: "sandbox" | "production") => void };
      Initialize: (options: { token: string }) => void;
      Checkout: {
        open: (options: { transactionId?: string; settings?: Record<string, unknown> }) => void;
      };
    };
  }
}

export function PaddlePayClient() {
  const searchParams = useSearchParams();
  const [transactionId, setTransactionId] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);

  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "";
  const env = (process.env.NEXT_PUBLIC_PADDLE_ENV || process.env.PADDLE_ENV || "sandbox") as "sandbox" | "production";

  useEffect(() => {
    setTransactionId(String(searchParams.get("_ptxn") || ""));
  }, [searchParams]);

  const canInit = useMemo(() => Boolean(clientToken && transactionId && loaded), [clientToken, transactionId, loaded]);

  useEffect(() => {
    if (loaded) return;
    const timer = window.setTimeout(() => {
      setLoadTimedOut(true);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [loaded]);

  useEffect(() => {
    if (!canInit || launched) return;
    if (!window.Paddle) return;

    try {
      window.Paddle.Environment.set(env);
      window.Paddle.Initialize({ token: clientToken });
      window.Paddle.Checkout.open({ transactionId });
      setLaunched(true);
    } catch {
      // no-op
    }
  }, [canInit, clientToken, env, launched, transactionId]);

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-10">
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
        onLoad={() => setLoaded(true)}
      />
      <h1 className="text-2xl font-semibold">Checkout sicuro</h1>
      {!clientToken ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Configurazione mancante: imposta <code>NEXT_PUBLIC_PADDLE_CLIENT_TOKEN</code> su Vercel.
        </p>
      ) : null}
      {!transactionId ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Link di pagamento non valido (transaction id mancante).
        </p>
      ) : null}
      {clientToken && transactionId ? (
        <p className="text-sm text-zinc-600">
          Stiamo aprendo il checkout Paddle. Se non compare, ricarica la pagina.
        </p>
      ) : null}
      {loadTimedOut && !loaded ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Il browser sta bloccando risorse esterne del checkout. Disattiva ad-block/tracking protection per questo sito e ricarica.
        </p>
      ) : null}
    </main>
  );
}
