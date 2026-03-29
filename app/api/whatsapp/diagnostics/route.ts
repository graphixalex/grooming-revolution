import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { canManageSettings } from "@/lib/rbac";
import { getWhatsAppDiagnosticsSummary } from "@/lib/whatsapp-diagnostics";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  if (!canManageSettings(auth.session.user.role)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const data = await getWhatsAppDiagnosticsSummary({
    salonId: auth.session.user.salonId,
    role: auth.session.user.role,
  });
  if (!data) {
    return NextResponse.json({ error: "Salone non trovato" }, { status: 404 });
  }
  return NextResponse.json(data);
}

