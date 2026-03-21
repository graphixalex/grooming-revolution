"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ProConsentActions() {
  const [accepted, setAccepted] = useState(false);

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
          per attivare il piano FULL.
        </span>
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button className="h-auto whitespace-normal py-3 text-center leading-tight" disabled={!accepted}>
          Attiva FULL (addebito automatico)
        </Button>
        <Button variant="outline" className="h-auto whitespace-normal py-3 text-center leading-tight">
          Gestisci o annulla abbonamento
        </Button>
      </div>
    </div>
  );
}

