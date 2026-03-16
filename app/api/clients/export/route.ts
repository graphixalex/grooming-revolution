import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";

function toCsvValue(value: string | null | undefined) {
  const s = (value ?? "").replaceAll('"', '""');
  return `"${s}"`;
}

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const clients = await prisma.client.findMany({ where: { salonId, deletedAt: null }, orderBy: { createdAt: "desc" } });

  const lines = ["nome,cognome,telefono,email,noteCliente"];
  for (const c of clients) {
    lines.push([toCsvValue(c.nome), toCsvValue(c.cognome), toCsvValue(c.telefono), toCsvValue(c.email), toCsvValue(c.noteCliente)].join(","));
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=contatti-clienti.csv",
    },
  });
}

