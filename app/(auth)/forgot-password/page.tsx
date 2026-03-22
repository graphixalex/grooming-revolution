"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Errore invio richiesta");
        return;
      }
      setMessage(
        data.message ||
          "Se esiste un account associato all'email, riceverai a breve le istruzioni per reimpostare la password.",
      );
    } catch {
      setError("Errore invio richiesta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full p-6">
      <h1 className="text-2xl font-semibold">Recupera password</h1>
      <p className="mb-4 text-sm text-zinc-600">Inserisci la tua email e ti invieremo il link di reset.</p>
      <form className="space-y-3" onSubmit={onSubmit}>
        <Input
          name="email"
          type="email"
          placeholder="Email account"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Invio in corso..." : "Invia link reset"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-zinc-600">
        Hai ricordato la password?{" "}
        <Link href="/login" className="text-zinc-900 underline">
          Torna al login
        </Link>
      </p>
    </Card>
  );
}

