import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveActiveSalonId } from "@/lib/active-salon";

export async function requireApiSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Non autorizzato" }, { status: 401 }) };
  }
  const cookieStore = await cookies();
  const requestedSalonId = cookieStore.get("active_salon_id")?.value;
  session.user.salonId = await resolveActiveSalonId(session.user, requestedSalonId);
  return { session };
}

