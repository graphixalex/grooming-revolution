"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      const form = new FormData(event.currentTarget);
      const email = String(form.get("email") || "");
      const password = String(form.get("password") || "");

      const result = await signIn("credentials", { email, password, redirect: false });

      if (!result) {
        setError("Errore temporaneo di accesso. Riprova.");
        return;
      }

      if (result.error) {
        setError("Credenziali non valide");
        return;
      }

      if (result.ok) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setError("Accesso non completato. Riprova.");
    } catch {
      setError("Errore temporaneo di accesso. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full p-6">
      <div className="mx-auto mb-3 h-14 w-full max-w-[280px] overflow-hidden rounded-lg border border-rose-300 bg-gradient-to-r from-rose-100 via-rose-100 to-pink-200 p-1">
        <Image
          src="/img/logo-grooming-revolution.png"
          alt="Grooming Revolution"
          width={640}
          height={180}
          className="h-full w-full origin-center object-contain object-center scale-[2.8] translate-y-[10px]"
          priority
        />
      </div>
      <h1 className="text-2xl font-semibold">Accedi</h1>
      <p className="mb-4 text-sm text-zinc-600">Gestisci il tuo salone Grooming Revolution</p>
      <form className="space-y-3" onSubmit={onSubmit}>
        <Input name="email" type="email" placeholder="Email" required />
        <Input name="password" type="password" placeholder="Password" required />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Accesso in corso..." : "Entra"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-zinc-600">
        Non hai un account? <Link href="/register" className="text-zinc-900 underline">Registrati</Link>
      </p>
      <div className="mt-3">
        <Link href="/" className="text-sm text-zinc-700 underline">
          Torna alla homepage
        </Link>
      </div>
    </Card>
  );
}

