"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ProConsentActions({
  currentPlan,
  hasPaddleSubscription,
}: {
  currentPlan: "FREE" | "PRO";
  hasPaddleSubscription: boolean;
}) {
  const [accepted, setAccepted] = useState(false);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [feedback, setFeedback] = useState<string>("");

  const isProManual = currentPlan === "PRO" && !hasPaddleSubscription;
  const canStartCheckout = currentPlan === "FREE";
  const canOpenPortal = hasPaddleSubscription;

  async function startCheckout() {
    if (!accepted || startingCheckout || !canStartCheckout) return;
    setStartingCheckout(true);
    setFeedback("");
    try {
      const res = await fetch("/api/paddle/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || "Impossibile avviare checkout");
        return;
      }
      if (!data.checkoutUrl) {
        setFeedback("Checkout URL non disponibile");
        return;
      }
      window.location.assign(data.checkoutUrl);
    } catch {
      setFeedback("Errore di rete durante avvio checkout");
    } finally {
      setStartingCheckout(false);
    }
  }

  async function openPortal() {
    if (openingPortal || !canOpenPortal) return;
    setOpeningPortal(true);
    setFeedback("");
    try {
      const res = await fetch("/api/paddle/portal");
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || "Impossibile aprire portale abbonamento");
        return;
      }
      if (!data.url) {
        setFeedback("URL portale non disponibile");
        return;
      }
      window.location.assign(data.url);
    } catch {
      setFeedback("Errore di rete durante apertura portale");
    } finally {
      setOpeningPortal(false);
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <label className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-zinc-300"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <span>
          Accetto{" "}
          <Link href="/legal/terms" className="font-semibold underline">
            Termini di Servizio
          </Link>
          ,{" "}
          <Link href="/legal/privacy" className="font-semibold underline">
            Privacy Policy
          </Link>{" "}
          e{" "}
          <Link href="/legal/cookies" className="font-semibold underline">
            Cookie Policy
          </Link>{" "}
          e{" "}
          <Link href="/refund-policy" className="font-semibold underline">
            Politica di rimborso
          </Link>{" "}
          per attivare il piano FULL.
        </span>
      </label>

      {isProManual ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Questo account e in piano PRO manuale (configurazione dev), ma non ha un abbonamento Paddle collegato.
        </div>
      ) : null}

      {feedback ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {feedback}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        {canStartCheckout ? (
          <Button
            className="h-auto whitespace-normal py-3 text-center leading-tight"
            disabled={!accepted || startingCheckout}
            onClick={startCheckout}
          >
            {startingCheckout ? "Apertura checkout..." : "Attiva FULL (addebito automatico)"}
          </Button>
        ) : (
          <Button className="h-auto whitespace-normal py-3 text-center leading-tight" disabled>
            Piano FULL gia attivo
          </Button>
        )}
        <Button
          variant="outline"
          className="h-auto whitespace-normal py-3 text-center leading-tight"
          onClick={openPortal}
          disabled={openingPortal || !canOpenPortal}
        >
          {openingPortal
            ? "Apertura portale..."
            : canOpenPortal
              ? "Gestisci o annulla abbonamento"
              : "Gestione abbonamento non disponibile"}
        </Button>
      </div>
    </div>
  );
}
