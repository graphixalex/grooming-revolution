import { getRequiredSession } from "@/lib/session";
import { MessagesClient } from "@/components/messages/messages-client";

export default async function MessagesPage() {
  await getRequiredSession();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Messaggi booking online</h1>
      <MessagesClient />
    </div>
  );
}
