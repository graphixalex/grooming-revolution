import { requireMetaScope } from "@/lib/meta-api-auth";
import { metaSignup } from "@/lib/whatsapp-embedded-signup";
import { metaErrorResponse } from "@/lib/meta-errors";
import { salonJson } from "@/lib/salon-response";
export const runtime = "nodejs";
export async function POST() {
  try {
    const scope = await requireMetaScope();
    const result = await metaSignup.disconnect(scope);
    return salonJson({ ok: true, ...(result as Record<string, unknown>) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return metaErrorResponse(error); }
}
