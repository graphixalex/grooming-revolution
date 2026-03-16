import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";

type QuoteBody = {
  caneId?: string;
  treatmentIds?: string[];
  at?: string;
};

function includesBreed(razza: string | null | undefined, pattern: string | null | undefined) {
  if (!pattern) return true;
  if (!razza) return false;
  return razza.toLowerCase().includes(pattern.toLowerCase().trim());
}

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const body = (await req.json()) as QuoteBody;
  const caneId = body.caneId;
  const treatmentIds = Array.isArray(body.treatmentIds) ? body.treatmentIds.filter(Boolean) : [];
  const at = body.at ? new Date(body.at) : new Date();

  if (!caneId) return NextResponse.json({ error: "caneId obbligatorio" }, { status: 400 });
  if (!treatmentIds.length) {
    return NextResponse.json({
      suggestedDuration: 60,
      suggestedAmount: 0,
      currency: "EUR",
      breakdown: [],
      missingTreatmentIds: [],
    });
  }

  const [dog, salon, rules] = await Promise.all([
    prisma.dog.findFirst({
      where: { id: caneId, salonId, deletedAt: null },
      select: { taglia: true, razza: true },
    }),
    prisma.salon.findUnique({
      where: { id: salonId },
      select: { valuta: true },
    }),
    prisma.servicePriceRule.findMany({
      where: {
        salonId,
        attiva: true,
        treatmentId: { in: treatmentIds },
      },
      select: {
        treatmentId: true,
        dogSize: true,
        razzaPattern: true,
        basePrice: true,
        extraPrice: true,
        durataMinuti: true,
        validoDa: true,
        validoA: true,
      },
      orderBy: { validoDa: "desc" },
    }),
  ]);

  if (!dog) return NextResponse.json({ error: "Cane non trovato" }, { status: 404 });

  const breakdown: Array<{ treatmentId: string; duration: number; amount: number; source: "rule" | "default" }> = [];
  const missingTreatmentIds: string[] = [];

  for (const treatmentId of treatmentIds) {
    const candidates = rules.filter((r) => {
      if (r.treatmentId !== treatmentId) return false;
      if (r.validoDa > at) return false;
      if (r.validoA && r.validoA < at) return false;
      if (r.dogSize && r.dogSize !== dog.taglia) return false;
      if (!includesBreed(dog.razza, r.razzaPattern)) return false;
      return true;
    });

    const scored = candidates
      .map((r) => ({
        rule: r,
        score: (r.dogSize ? 10 : 0) + (r.razzaPattern ? 5 : 0),
      }))
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return b.rule.validoDa.getTime() - a.rule.validoDa.getTime();
      });

    const best = scored[0]?.rule;

    if (!best) {
      breakdown.push({ treatmentId, duration: 60, amount: 0, source: "default" });
      missingTreatmentIds.push(treatmentId);
      continue;
    }

    // Price quote uses base + extra if present in historical rules.
    breakdown.push({
      treatmentId,
      duration: best.durataMinuti,
      amount: Number(best.basePrice) + Number(best.extraPrice || 0),
      source: "rule",
    });
  }

  const suggestedDuration = Math.max(
    15,
    Math.ceil(breakdown.reduce((acc, item) => acc + item.duration, 0) / 15) * 15,
  );
  const suggestedAmount = breakdown.reduce((acc, item) => acc + item.amount, 0);

  return NextResponse.json({
    suggestedDuration,
    suggestedAmount: Number(suggestedAmount.toFixed(2)),
    currency: salon?.valuta || "EUR",
    breakdown,
    missingTreatmentIds,
  });
}

