import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function addAuditLog(input: {
  salonId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metaJson?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
}) {
  await prisma.auditLog.create({
    data: {
      ...input,
      metaJson: input.metaJson,
    },
  });
}

