import { PrismaClient, UserRole, DogSize, AppointmentStatus, PaymentMethod, Prisma } from "@prisma/client";
import argon2 from "argon2";
import { addMinutes, startOfDay, setHours, setMinutes } from "date-fns";

const prisma = new PrismaClient();

const TRATTAMENTI_DEFAULT = [
  "Bagno",
  "Tosatura",
  "Taglio macchinetta e forbice",
  "Taglio a forbice",
  "Stripping",
  "Slanatura",
  "Snodatura",
  "Antiparassitario",
  "Spa",
  "Trattamento Dermatologico",
];

async function main() {
  const emailOwner = "owner@groomingrevolution.local";
  const passwordHash = await argon2.hash("Password123!");
  const salonGroup = await prisma.salonGroup.upsert({
    where: { id: "group_demo" },
    update: { nome: "Grooming Revolution Group Demo" },
    create: { id: "group_demo", nome: "Grooming Revolution Group Demo" },
  });

  const salon = await prisma.salon.upsert({
    where: { id: "salon_demo" },
    update: { salonGroupId: salonGroup.id, nomeSede: "Milano Centro" },
    create: {
      id: "salon_demo",
      salonGroupId: salonGroup.id,
      nomeAttivita: "Grooming Revolution Demo",
      nomeSede: "Milano Centro",
      paese: "IT",
      timezone: "Europe/Rome",
      valuta: "EUR",
      vatRate: new Prisma.Decimal(22),
      vatIncluded: true,
      indirizzo: "Via Roma 10, Milano",
      telefono: "+39021234567",
      email: "info@groomingrevolution.local",
      whatsappTemplate:
        "Ciao %nome_cliente%, promemoria per %nome_pet% il %data_appuntamento% alle %orario_appuntamento% presso %nome_attività% (%indirizzo_attività%).",
      emailTemplate:
        "Gentile %nome_cliente%,\n\nricordiamo l'appuntamento di %nome_pet% in data %data_appuntamento% alle ore %orario_appuntamento%.\n\n%nome_attività%",
      workingHoursJson: {
        mon: { enabled: true, start: "08:30", end: "18:30", breaks: [{ start: "13:00", end: "14:00" }] },
        tue: { enabled: true, start: "08:30", end: "18:30", breaks: [{ start: "13:00", end: "14:00" }] },
        wed: { enabled: true, start: "08:30", end: "18:30", breaks: [{ start: "13:00", end: "14:00" }] },
        thu: { enabled: true, start: "08:30", end: "18:30", breaks: [{ start: "13:00", end: "14:00" }] },
        fri: { enabled: true, start: "08:30", end: "18:30", breaks: [{ start: "13:00", end: "14:00" }] },
        sat: { enabled: true, start: "09:00", end: "13:00", breaks: [] },
        sun: { enabled: false, start: "00:00", end: "00:00", breaks: [] },
      },
      subscriptionPlan: "FREE",
      billingCountry: "IT",
      billingVatNumber: "IT12345678901",
    },
  });

  const owner = await prisma.user.upsert({
    where: { salonId_email: { salonId: salon.id, email: emailOwner } },
    update: { passwordHash },
    create: {
      salonId: salon.id,
      email: emailOwner,
      passwordHash,
      ruolo: UserRole.OWNER,
    },
  });

  const staff = await prisma.user.upsert({
    where: { salonId_email: { salonId: salon.id, email: "staff@groomingrevolution.local" } },
    update: { passwordHash },
    create: {
      salonId: salon.id,
      email: "staff@groomingrevolution.local",
      passwordHash,
      ruolo: UserRole.STAFF,
    },
  });

  await prisma.user.upsert({
    where: { salonId_email: { salonId: salon.id, email: "manager@groomingrevolution.local" } },
    update: { passwordHash, ruolo: UserRole.MANAGER },
    create: {
      salonId: salon.id,
      email: "manager@groomingrevolution.local",
      passwordHash,
      ruolo: UserRole.MANAGER,
    },
  });

  await prisma.treatment.deleteMany({ where: { salonId: salon.id } });
  await prisma.quickTag.deleteMany({ where: { salonId: salon.id } });

  const treatments = await Promise.all(
    TRATTAMENTI_DEFAULT.map((nome, ordine) =>
      prisma.treatment.create({
        data: { salonId: salon.id, nome, ordine, attivo: true },
      }),
    ),
  );

  const quickTags = await Promise.all(
    ["Ansioso", "Pelo lungo", "Allergie", "No phon", "Anziano"].map((nome, ordine) =>
      prisma.quickTag.create({ data: { salonId: salon.id, nome, ordine } }),
    ),
  );

  await prisma.appointmentTreatment.deleteMany({ where: { appointment: { salonId: salon.id } } });
  await prisma.transaction.deleteMany({ where: { salonId: salon.id } });
  await prisma.appointment.deleteMany({ where: { salonId: salon.id } });
  await prisma.dogQuickTag.deleteMany({ where: { dog: { salonId: salon.id } } });
  await prisma.dog.deleteMany({ where: { salonId: salon.id } });
  await prisma.client.deleteMany({ where: { salonId: salon.id } });

  const cliente1 = await prisma.client.create({
    data: {
      salonId: salon.id,
      nome: "Giulia",
      cognome: "Bianchi",
      telefono: "+393401112233",
      email: "giulia@example.com",
      consensoPromemoria: true,
      consensoTimestamp: new Date(),
      noteCliente: "Preferisce appuntamenti mattutini.",
    },
  });

  const dog1 = await prisma.dog.create({
    data: {
      salonId: salon.id,
      clienteId: cliente1.id,
      nome: "Luna",
      razza: "Barboncino",
      taglia: DogSize.S,
      noteCane: "Pelo delicato, usare shampoo ipoallergenico.",
      tagRapidi: {
        create: quickTags.slice(0, 2).map((tag) => ({ quickTagId: tag.id })),
      },
    },
  });

  const cliente2 = await prisma.client.create({
    data: {
      salonId: salon.id,
      nome: "Marco",
      cognome: "Verdi",
      telefono: "+393477778888",
      email: "marco@example.com",
      noteCliente: "Contatto preferito WhatsApp.",
    },
  });

  const dog2 = await prisma.dog.create({
    data: {
      salonId: salon.id,
      clienteId: cliente2.id,
      nome: "Thor",
      razza: "Golden Retriever",
      taglia: DogSize.L,
      noteCane: "Molto socievole.",
      tagRapidi: {
        create: quickTags.slice(2, 4).map((tag) => ({ quickTagId: tag.id })),
      },
    },
  });

  const today = startOfDay(new Date());
  const start1 = setMinutes(setHours(today, 10), 0);
  const end1 = addMinutes(start1, 90);

  const completedAppointment = await prisma.appointment.create({
    data: {
      salonId: salon.id,
      clienteId: cliente1.id,
      caneId: dog1.id,
      startAt: addMinutes(start1, -1440),
      endAt: addMinutes(end1, -1440),
      durataMinuti: 90,
      noteAppuntamento: "Taglio corto primavera.",
      stato: AppointmentStatus.COMPLETATO,
      createdById: owner.id,
      trattamentiSelezionati: {
        create: [{ treatmentId: treatments[0].id }, { treatmentId: treatments[3].id }],
      },
    },
  });

  await prisma.appointment.create({
    data: {
      salonId: salon.id,
      clienteId: cliente2.id,
      caneId: dog2.id,
      startAt: start1,
      endAt: end1,
      durataMinuti: 90,
      noteAppuntamento: "Portare pettorina morbida.",
      stato: AppointmentStatus.PRENOTATO,
      createdById: staff.id,
      trattamentiSelezionati: {
        create: [{ treatmentId: treatments[1].id }, { treatmentId: treatments[8].id }],
      },
    },
  });

  await prisma.transaction.createMany({
    data: [
      {
        salonId: salon.id,
        appointmentId: completedAppointment.id,
        amount: new Prisma.Decimal(55),
        tipAmount: new Prisma.Decimal(5),
        method: PaymentMethod.POS,
        vatRate: new Prisma.Decimal(22),
        vatAmount: new Prisma.Decimal(9.92),
        netAmount: new Prisma.Decimal(45.08),
        grossAmount: new Prisma.Decimal(60),
        dateTime: new Date(),
        note: "Saldo completo",
        createdById: owner.id,
      },
    ],
  });

  await prisma.auditLog.create({
    data: {
      salonId: salon.id,
      userId: owner.id,
      action: "SEED_INIT",
      entityType: "SYSTEM",
      entityId: salon.id,
      metaJson: { message: "Dati demo inizializzati" },
    },
  });

  console.log("Seed completato");
  console.log("Owner login:", emailOwner, " / Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

