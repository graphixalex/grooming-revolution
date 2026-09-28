import { requireMetaScope } from "@/lib/meta-api-auth";
import { metaSignup } from "@/lib/whatsapp-embedded-signup";
import { metaErrorResponse, MetaError } from "@/lib/meta-errors";
import { salonJson } from "@/lib/salon-response";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const scope = await requireMetaScope();
    const body: unknown = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new MetaError("meta_invalid_request");
    const result = await metaSignup.complete(scope, body as Record<string, unknown>);
    return salonJson({ ok: true, ...(result as Record<string, unknown>) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return metaErrorResponse(error); }
}
