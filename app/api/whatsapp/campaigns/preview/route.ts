import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { CampaignAudienceSegment, listCampaignAudienceRecipients } from "@/lib/client-frequency";

function parseCampaignSegment(raw: string | null): CampaignAudienceSegment {
  const value = raw || "ALL_RECENT";
  if (
    value === "ALL_RECENT" ||
    value === "RETURN_MAX_5_WEEKS" ||
    value === "RETURN_MAX_8_WEEKS" ||
    value === "RETURN_MAX_12_WEEKS" ||
    value === "INACTIVE_OVER_12_WEEKS"
  ) {
    return value;
  }
  return "ALL_RECENT";
}

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const typeParam = req.nextUrl.searchParams.get("type");
  const monthsBackParam = req.nextUrl.searchParams.get("monthsBack");
  const segmentParam = req.nextUrl.searchParams.get("segment");
  const type = typeParam === "MARKETING" ? "MARKETING" : "SERVICE";
  const monthsBack = Math.max(1, Math.min(36, Number(monthsBackParam) || 12));
  const segment = parseCampaignSegment(segmentParam);

  const recipients = await listCampaignAudienceRecipients({
    salonId,
    type,
    monthsBack,
    segment,
  });

  return NextResponse.json({ recipients: recipients.length, type, monthsBack, segment });
}
