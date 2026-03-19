import { z } from "zod";

export const registerSchema = z.object({
  nomeAttivita: z.string().min(2),
  nomeSede: z.string().min(2),
  indirizzo: z.string().min(5),
  paese: z.string().length(2),
  valuta: z.string().length(3).optional(),
  timezone: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export const clientSchema = z.object({
  nome: z.string().min(1),
  cognome: z.string().min(1),
  telefono: z.string().min(5),
  email: z.string().email().optional().or(z.literal("")),
  noteCliente: z.string().optional(),
  consensoPromemoria: z.boolean().default(false),
});

export const dogSchema = z.object({
  clienteId: z.string().min(1),
  nome: z.string().min(1),
  razza: z.string().optional(),
  taglia: z.enum(["XS", "S", "M", "L", "XL", "XXL"]),
  noteCane: z.string().optional(),
  tagRapidiIds: z.array(z.string()).default([]),
});

export const appointmentSchema = z.object({
  clienteId: z.string().min(1),
  caneId: z.string().min(1),
  startAt: z.string().datetime(),
  durataMinuti: z.number().min(15).max(300).refine((v) => v % 15 === 0),
  noteAppuntamento: z.string().optional(),
  trattamentiIds: z.array(z.string()).default([]),
});

export const transactionSchema = z.object({
  appointmentId: z.string().min(1),
  amount: z.number().positive(),
  tipAmount: z.number().min(0).default(0),
  method: z.enum(["POS", "CASH"]),
  note: z.string().optional(),
});

export const servicePriceRuleSchema = z.object({
  treatmentId: z.string().min(1),
  dogSize: z.enum(["XS", "S", "M", "L", "XL", "XXL"]).optional().nullable(),
  razzaPattern: z.string().optional().nullable(),
  extraLabel: z.string().optional().nullable(),
  basePrice: z.number().min(0),
  extraPrice: z.number().min(0).default(0),
  durataMinuti: z.number().int().min(15).max(480),
  validoDa: z.string().datetime(),
  validoA: z.string().datetime().optional().nullable(),
  note: z.string().optional().nullable(),
});

export const openCashSessionSchema = z.object({
  openingFloat: z.number().min(0),
  noteApertura: z.string().optional(),
});

export const closeCashSessionSchema = z.object({
  closingCounted: z.number().min(0),
  noteChiusura: z.string().optional(),
});

export const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["MANAGER", "STAFF"]).optional().default("STAFF"),
  salonId: z.string().min(1).optional(),
});

