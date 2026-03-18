import { Card } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <Card className="w-full p-6">
      <h1 className="text-2xl font-semibold">Crea account</h1>
      <p className="mb-4 text-sm text-zinc-600">Configura subito attivita, sede, paese e valuta.</p>
      <RegisterForm />
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link href="/login" className="text-zinc-900 underline">
          Torna al login
        </Link>
        <Link href="/" className="text-zinc-700 underline">
          Torna alla homepage
        </Link>
      </div>
    </Card>
  );
}
