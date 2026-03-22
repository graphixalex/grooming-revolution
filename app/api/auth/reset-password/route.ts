import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validators";
import { sendPasswordChangedEmail } from "@/lib/email";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati reset password non validi" }, { status: 400 });
  }

  const tokenHash = hashToken(parsed.data.token);
  const now = new Date();

  const tokenRow = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: now },
    },
    include: {
      user: { select: { id: true, email: true, passwordHash: true } },
    },
  });
  if (!tokenRow) {
    return NextResponse.json({ error: "Token non valido o scaduto" }, { status: 400 });
  }

  const sameAsCurrent = await bcrypt.compare(parsed.data.newPassword, tokenRow.user.passwordHash);
  if (sameAsCurrent) {
    return NextResponse.json({ error: "La nuova password deve essere diversa da quella attuale" }, { status: 400 });
  }

  const nextHash = await bcrypt.hash(parsed.data.newPassword, 12);

  await prisma.$transaction(async (trx) => {
    await trx.user.update({
      where: { id: tokenRow.user.id },
      data: { passwordHash: nextHash },
    });
    await trx.passwordResetToken.update({
      where: { id: tokenRow.id },
      data: { usedAt: now },
    });
    await trx.passwordResetToken.deleteMany({
      where: {
        userId: tokenRow.user.id,
        id: { not: tokenRow.id },
      },
    });
  });

  await sendPasswordChangedEmail({
    to: tokenRow.user.email,
    changedByEmail: null,
  });

  return NextResponse.json({ ok: true });
}

