import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import {
  disconnectLinkedGatewaySession,
  getLinkedGatewayQr,
  getWhatsAppConnectionDiagnostics,
  initLinkedGatewaySession,
  updateConnectionStatus,
} from "@/lib/whatsapp-connection";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;
  const result = await getWhatsAppConnectionDiagnostics(salonId);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;
  const init = await initLinkedGatewaySession(salonId);
  if (!init.ok) {
    return NextResponse.json({ error: init.message, code: init.code }, { status: init.status || 502 });
  }

  const diagnostics = await getWhatsAppConnectionDiagnostics(salonId);
  const includeQr = req.nextUrl.searchParams.get("includeQr") === "1";
  if (!includeQr) return NextResponse.json({ ok: true, ...diagnostics });

  const qr = await getLinkedGatewayQr(salonId);
  return NextResponse.json({
    ok: true,
    ...diagnostics,
    qr: qr.ok ? qr.data : null,
    qrError: qr.ok ? null : { code: qr.code, message: qr.message },
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;
  const mode = req.nextUrl.searchParams.get("mode") || "sync";
  if (mode === "sync") {
    const diagnostics = await getWhatsAppConnectionDiagnostics(salonId);
    return NextResponse.json({ ok: true, ...diagnostics });
  }
  if (mode === "qr") {
    const qr = await getLinkedGatewayQr(salonId);
    if (!qr.ok) return NextResponse.json({ error: qr.message, code: qr.code }, { status: qr.status || 502 });
    return NextResponse.json({ ok: true, qr: qr.data });
  }
  return NextResponse.json({ error: "Mode non valido" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;
  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason.trim() : "Disconnessione manuale";
  await disconnectLinkedGatewaySession(salonId);
  await updateConnectionStatus(salonId, "DISCONNECTED", reason);
  const diagnostics = await getWhatsAppConnectionDiagnostics(salonId);
  return NextResponse.json({ ok: true, ...diagnostics });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "").trim().toLowerCase();

  if (action === "disable") {
    const reason =
      typeof body.reason === "string" && body.reason.trim().length > 0
        ? body.reason.trim()
        : "Kill-switch manuale attivato";
    await updateConnectionStatus(salonId, "DISABLED", reason);
  } else if (action === "enable") {
    await updateConnectionStatus(salonId, "DISCONNECTED");
  } else {
    return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
  }

  const diagnostics = await getWhatsAppConnectionDiagnostics(salonId);
  return NextResponse.json({ ok: true, ...diagnostics });
}
