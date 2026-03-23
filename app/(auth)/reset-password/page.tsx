"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Token mancante. Richiedi un nuovo link di reset.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword,
          confirmNewPassword: confirmPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Reset password non riuscito");
        return;
      }
      setMessage("Password aggiornata con successo. Ora puoi accedere.");
      setTimeout(() => {
        router.push("/login");
      }, 1000);
    } catch {
      setError("Reset password non riuscito");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full p-6">
      <div className="mx-auto mb-3 h-14 w-full max-w-[320px] overflow-hidden rounded-lg border border-zinc-200 bg-white p-1.5">
        <Image
          src="/img/logo-grooming-revolution.png"
          alt="Grooming Revolution"
          width={640}
          height={180}
          className="h-full w-full object-contain object-center"
          priority
        />
      </div>
      <h1 className="text-2xl font-semibold">Reimposta password</h1>
      <p className="mb-4 text-sm text-zinc-600">Inserisci e conferma la nuova password.</p>
      <p className="mb-4 text-xs text-zinc-500">
        Requisiti: minimo 10 caratteri, almeno una minuscola, una maiuscola, un numero e un simbolo.
      </p>
      <form className="space-y-3" onSubmit={onSubmit}>
        <div className="relative">
          <Input
            type={showNew ? "text" : "password"}
            placeholder="Nuova password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="pr-20"
            required
          />
          <Button
            type="button"
            variant="outline"
            className="absolute right-1 top-1 h-8 px-2 text-xs"
            onClick={() => setShowNew((v) => !v)}
          >
            {showNew ? "Nascondi" : "Mostra"}
          </Button>
        </div>
        <div className="relative">
          <Input
            type={showConfirm ? "text" : "password"}
            placeholder="Conferma nuova password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="pr-20"
            required
          />
          <Button
            type="button"
            variant="outline"
            className="absolute right-1 top-1 h-8 px-2 text-xs"
            onClick={() => setShowConfirm((v) => !v)}
          >
            {showConfirm ? "Nascondi" : "Mostra"}
          </Button>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Aggiornamento..." : "Aggiorna password"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-zinc-600">
        Torna al{" "}
        <Link href="/login" className="text-zinc-900 underline">
          login
        </Link>
      </p>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Card className="w-full p-6"><p className="text-sm text-zinc-600">Caricamento...</p></Card>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
