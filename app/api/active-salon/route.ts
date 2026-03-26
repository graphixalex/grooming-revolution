import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { resolveActiveSalonId } from "@/lib/active-salon";

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const body = (await req.json()) as { salonId?: string };
  if (!body.salonId) {
    return NextResponse.json({ error: "salonId obbligatorio" }, { status: 400 });
  }

  const salonId = await resolveActiveSalonId(auth.session.user, body.salonId);
  const res = NextResponse.json({ salonId });
  res.cookies.set("active_salon_id", salonId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
