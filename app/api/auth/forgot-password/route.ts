import crypto from "node:crypto";
import { addMinutes } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validators";
import { getClientIp } from "@/lib/request";
import { isForgotPasswordRateLimited, recordForgotPasswordAttempt } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";

const GENERIC_MESSAGE =
  "Se esiste un account associato all'email, riceverai a breve le istruzioni per reimpostare la password.";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateRawToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const limiterKey = `${getClientIp(req)}:${email}`;
  if (isForgotPasswordRateLimited(limiterKey)) {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }
  recordForgotPasswordAttempt(limiterKey);

  const users = await prisma.user.findMany({
    where: { email },
    select: { id: true, email: true },
    take: 2,
  });
  if (users.length !== 1) {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }
  const user = users[0];

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = addMinutes(new Date(), 30);

  await prisma.$transaction(async (trx) => {
    await trx.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        OR: [{ usedAt: null }, { expiresAt: { lt: new Date() } }],
      },
    });
    await trx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });
  });

  await sendPasswordResetEmail({
    to: user.email,
    rawToken,
    expiresInMinutes: 30,
  });

  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
}

