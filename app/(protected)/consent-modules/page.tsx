import { ConsentModulesClient } from "@/components/clients/consent-modules-client";

export default function ConsentModulesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Moduli consensi</h1>
      <ConsentModulesClient />
    </div>
  );
}
