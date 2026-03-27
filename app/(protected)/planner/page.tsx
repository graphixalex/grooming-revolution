import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/session";
import { PlannerClient } from "@/components/planner/planner-client";
import { Prisma } from "@prisma/client";
import { DEFAULT_WHATSAPP_BOOKING_CONFIRM_TEMPLATE } from "@/lib/default-templates";

export default async function PlannerPage() {
  const session = await getRequiredSession();
  const treatmentsPromise = (async () => {
    try {
      return await prisma.treatment.findMany({
        where: { salonId: session.user.salonId },
        orderBy: { ordine: "asc" },
        select: { id: true, nome: true, attivo: true, ordine: true, color: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2021" || error.code === "P2022")
      ) {
        const legacyTreatments = await prisma.treatment.findMany({
          where: { salonId: session.user.salonId },
          orderBy: { ordine: "asc" },
          select: { id: true, nome: true, attivo: true, ordine: true },
        });
        return legacyTreatments.map((t) => ({ ...t, color: "#2563eb" }));
      }
      throw error;
    }
  })();
  const operatorsPromise = (async () => {
    try {
      return await prisma.operator.findMany({
        where: { salonId: session.user.salonId, attivo: true },
        orderBy: { ordine: "asc" },
        select: { id: true, nome: true, color: true, workingHoursJson: true, agendaColumns: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2021" || error.code === "P2022")
      ) {
        const legacyOperators = await prisma.operator.findMany({
          where: { salonId: session.user.salonId, attivo: true },
          orderBy: { ordine: "asc" },
          select: { id: true, nome: true, color: true, workingHoursJson: true },
        });
        return legacyOperators.map((op) => ({ ...op, agendaColumns: 1 }));
      }
      throw error;
    }
  })();
  const salonPromise = (async () => {
    try {
      return await prisma.salon.findUnique({
        where: { id: session.user.salonId },
        select: {
          workingHoursJson: true,
          whatsappTemplate: true,
          whatsappBookingTemplate: true,
          nomeAttivita: true,
          nomeSede: true,
          indirizzo: true,
          salonGroupId: true,
          valuta: true,
          timezone: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2021" || error.code === "P2022")
      ) {
        const legacySalon = await prisma.salon.findUnique({
          where: { id: session.user.salonId },
          select: {
            workingHoursJson: true,
            whatsappTemplate: true,
            nomeAttivita: true,
            nomeSede: true,
            indirizzo: true,
            salonGroupId: true,
            valuta: true,
            timezone: true,
          },
        });
        return legacySalon ? { ...legacySalon, whatsappBookingTemplate: null } : legacySalon;
      }
      throw error;
    }
  })();
  const [treatments, salon, operators] = await Promise.all([
    treatmentsPromise,
    salonPromise,
    operatorsPromise,
  ]);
  const branches =
    session.user.role === "OWNER" && salon?.salonGroupId
      ? await prisma.salon.findMany({
          where: { salonGroupId: salon.salonGroupId },
          select: { id: true, nomeAttivita: true, nomeSede: true },
          orderBy: { createdAt: "asc" },
        })
      : [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Agenda</h1>
      <PlannerClient
        treatments={treatments}
        workingHoursJson={(salon?.workingHoursJson as Prisma.JsonObject | null) ?? null}
        whatsappConfig={{
          template: salon?.whatsappBookingTemplate || salon?.whatsappTemplate || DEFAULT_WHATSAPP_BOOKING_CONFIRM_TEMPLATE,
          nomeAttivita: salon?.nomeAttivita || "",
          indirizzoAttivita: salon?.indirizzo || "",
        }}
        currency={salon?.valuta || "EUR"}
        timezone={salon?.timezone || "Europe/Zurich"}
        operators={operators as any[]}
        branchSwitcher={
          branches.length > 1
            ? {
                currentSalonId: session.user.salonId,
                branches: branches.map((b) => ({
                  id: b.id,
                  label: b.nomeSede || "Sede principale",
                })),
              }
            : null
        }
      />
    </div>
  );
}

