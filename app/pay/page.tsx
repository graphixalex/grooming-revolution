import { PaddlePayClient } from "@/components/billing/paddle-pay-client";
import { Suspense } from "react";

export default function PaddlePayPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-2xl px-4 py-10 text-sm text-zinc-600">Caricamento checkout...</main>}>
      <PaddlePayClient />
    </Suspense>
  );
}
