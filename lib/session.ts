import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveActiveSalonId } from "@/lib/active-salon";

export async function getRequiredSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  const cookieStore = await cookies();
  const requestedSalonId = cookieStore.get("active_salon_id")?.value;
  session.user.salonId = await resolveActiveSalonId(session.user, requestedSalonId);
  return session;
}

