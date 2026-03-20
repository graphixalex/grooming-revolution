import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const typeParam = req.nextUrl.searchParams.get("type");
  const monthsBackParam = req.nextUrl.searchParams.get("monthsBack");
  const type = typeParam === "MARKETING" ? "MARKETING" : "SERVICE";
  const monthsBack = Math.max(1, Math.min(36, Number(monthsBackParam) || 12));

  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - monthsBack);

  const recipients = await prisma.client.count({
    where: {
      salonId,
      deletedAt: null,
      createdAt: { gte: fromDate },
      telefono: { not: "__NOTE__" },
      ...(type === "MARKETING" ? { consensoPromemoria: true } : {}),
    },
  });

  return NextResponse.json({ recipients, type, monthsBack });
}
