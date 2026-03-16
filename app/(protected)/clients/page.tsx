import { ClientsClient } from "@/components/clients/clients-client";

export default function ClientsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Clienti</h1>
      <ClientsClient />
    </div>
  );
}

