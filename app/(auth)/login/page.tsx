"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
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
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");

    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      setError("Credenziali non valide");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full p-6">
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
    </Card>
  );
}

