import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const count = await prisma.bookingRequest.count({
    where: { salonId, status: "PENDING" },
  });

  return NextResponse.json({ count });
}

