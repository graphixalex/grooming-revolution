import { Card } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <Card className="w-full p-6">
      <h1 className="text-2xl font-semibold">Crea account</h1>
      <p className="mb-4 text-sm text-zinc-600">Configura subito attivita, sede, paese e valuta.</p>
      <RegisterForm />
    </Card>
  );
}
