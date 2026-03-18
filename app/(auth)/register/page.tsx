import { Card } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";
import Link from "next/link";
import Image from "next/image";

export default function RegisterPage() {
  return (
    <Card className="w-full p-6">
      <div className="mb-3 h-14 w-full max-w-[280px] overflow-hidden rounded-lg border border-rose-200 bg-gradient-to-r from-rose-50 via-pink-50 to-rose-100 p-1">
        <Image
          src="/img/logo-grooming-revolution.png"
          alt="Grooming Revolution"
          width={640}
          height={180}
          className="h-full w-full origin-center object-contain object-center scale-[2.8] translate-y-[3px]"
          priority
        />
      </div>
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
