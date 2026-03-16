import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { getAccountingScope } from "@/lib/accounting-scope";

function q(v: string | null | undefined) {
  const s = (v ?? "").replaceAll('"', '""');
  return `"${s}"`;
}

export async function GET(req: Request) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") || undefined;
  const accountingScope = await getAccountingScope(auth.session.user, scope);

  const tx = await prisma.transaction.findMany({
    where: { salonId: { in: accountingScope.salonIds } },
    include: { appointment: { include: { cane: true, cliente: true } }, salon: true },
    orderBy: { dateTime: "desc" },
  });

  const lines = ["data,sede,valuta,metodo,servizio,mancia,totale,cane,cliente,note"];
  for (const t of tx) {
    const cliente = `${t.appointment.cliente.nome} ${t.appointment.cliente.cognome}`;
    const sede = t.salon.nomeSede || "Sede principale";
    lines.push([
      q(t.dateTime.toISOString()),
      q(sede),
      q(t.salon.valuta),
      q(t.method),
      q(t.amount.toString()),
      q(t.tipAmount.toString()),
      q(t.grossAmount.toString()),
      q(t.appointment.cane.nome),
      q(cliente),
      q(t.note),
    ].join(","));
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=movimenti.csv",
    },
  });
}

