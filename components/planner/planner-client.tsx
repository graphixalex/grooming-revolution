"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addMinutes, format } from "date-fns";
import { it as dateFnsIt } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Cliente = { id: string; nome: string; cognome: string; telefono: string; email?: string | null };
type Cane = { id: string; nome: string; razza?: string | null; taglia: "XS" | "S" | "M" | "L" | "XL" | "XXL"; clienteId: string };
type Treatment = { id: string; nome: string; attivo: boolean };
type Operator = {
  id: string;
  nome: string;
  attivo?: boolean;
  color?: string | null;
  workingHoursJson?: WorkingHoursJson | null;
};
type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type WorkingHoursRow = {
  enabled: boolean;
  start: string;
  end: string;
  breaks: Array<{ start: string; end: string }>;
};

type WorkingHoursJson = Partial<Record<DayKey, WorkingHoursRow>>;

type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  noteAppuntamento?: string | null;
  operator?: { id: string; nome: string; color?: string | null } | null;
  cane: { id: string; nome: string; razza?: string | null; taglia: "XS" | "S" | "M" | "L" | "XL" | "XXL" };
  cliente: { id: string; nome: string; cognome: string; telefono: string };
  trattamentiSelezionati: Array<{ treatment: { id: string; nome: string } }>;
  transactions: Array<{ id: string }>;
  stato: string;
};

type ListinoQuote = {
  suggestedDuration: number;
  suggestedAmount: number;
  currency: string;
  missingTreatmentIds: string[];
};

function isPersonalNoteAppointment(a: Appointment) {
  return a.cliente.telefono === "__NOTE__";
}

function normalizeHexColor(input?: string | null) {
  if (!input) return null;
  const value = input.trim();
  const short = /^#([0-9a-fA-F]{3})$/.exec(value);
  if (short) {
    return `#${short[1][0]}${short[1][0]}${short[1][1]}${short[1][1]}${short[1][2]}${short[1][2]}`.toLowerCase();
  }
  const full = /^#([0-9a-fA-F]{6})$/.exec(value);
  return full ? `#${full[1].toLowerCase()}` : null;
}

function hexToRgb(hex: string) {
  const value = normalizeHexColor(hex);
  if (!value) return null;
  return {
    r: parseInt(value.slice(1, 3), 16),
    g: parseInt(value.slice(3, 5), 16),
    b: parseInt(value.slice(5, 7), 16),
  };
}

function rgbToHex(rgb: { r: number; g: number; b: number }) {
  const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function mixHex(base: string, target: string, targetWeight: number) {
  const a = hexToRgb(base);
  const b = hexToRgb(target);
  if (!a || !b) return base;
  const w = Math.max(0, Math.min(1, targetWeight));
  return rgbToHex({
    r: a.r * (1 - w) + b.r * w,
    g: a.g * (1 - w) + b.g * w,
    b: a.b * (1 - w) + b.b * w,
  });
}

function getProfessionalOperatorColor(raw?: string | null) {
  const safe = normalizeHexColor(raw) || "#2563eb";
  const tonedDown = mixHex(safe, "#1f2937", 0.45);
  return mixHex(tonedDown, "#f8fafc", 0.1);
}

function getAppointmentBgColor(appt: Appointment) {
  if (isPersonalNoteAppointment(appt)) return "#475569";
  if (appt.stato === "CANCELLATO") return "#64748b";
  if (appt.stato === "NO_SHOW") return "#a16207";
  if ((appt.transactions?.length ?? 0) > 0) return "#0f766e";
  return getProfessionalOperatorColor(appt.operator?.color);
}

const durations = Array.from({ length: 20 }, (_, i) => (i + 1) * 15);
const dayKeyToIndex: Record<DayKey, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const indexToDayKey: Record<number, DayKey> = { 0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat" };

function toMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(value: number) {
  const h = Math.floor(value / 60);
  const m = value % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

function getWorkingHoursConfig(workingHoursJson: WorkingHoursJson | null | undefined) {
  const rows = Object.entries(workingHoursJson ?? {}) as Array<[DayKey, WorkingHoursRow]>;
  const enabledRows = rows.filter(([, v]) => v?.enabled);
  if (!enabledRows.length) {
    return {
      slotMinTime: "07:00:00",
      slotMaxTime: "22:00:00",
      businessHours: false,
    };
  }

  const min = Math.min(...enabledRows.map(([, v]) => toMinutes(v.start)));
  const max = Math.max(...enabledRows.map(([, v]) => toMinutes(v.end)));
  const businessHours = enabledRows.map(([k, v]) => ({
    daysOfWeek: [dayKeyToIndex[k]],
    startTime: `${v.start}:00`,
    endTime: `${v.end}:00`,
  }));

  return {
    slotMinTime: fromMinutes(min),
    slotMaxTime: fromMinutes(max),
    businessHours,
  };
}

function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number) {
  const out = new Date(date);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeekMonday(start: Date) {
  const d = new Date(start);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatHmFromMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function capitalizeFirst(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function parseJumpDateInput(raw: string) {
  const value = raw.trim();
  if (!value) return null;
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (isoMatch) {
    const d = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const itMatch = /^(\d{2})[./-](\d{2})[./-](\d{4})$/.exec(value);
  if (itMatch) {
    const d = new Date(`${itMatch[3]}-${itMatch[2]}-${itMatch[1]}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toTimeInputValue(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function buildLocalDateTime(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) return null;
  const d = new Date(`${dateValue}T${timeValue}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ymdUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getItalianHolidayEvents(fromIso: string, toIso: string) {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const events: Array<{ id: string; title: string; start: string; allDay: true; color: string; textColor: string }> = [];
  const fixed = [
    { md: "01-01", title: "Capodanno" },
    { md: "01-06", title: "Epifania" },
    { md: "04-25", title: "Festa della Liberazione" },
    { md: "05-01", title: "Festa dei Lavoratori" },
    { md: "06-02", title: "Festa della Repubblica" },
    { md: "08-15", title: "Ferragosto" },
    { md: "11-01", title: "Ognissanti" },
    { md: "12-08", title: "Immacolata Concezione" },
    { md: "12-25", title: "Natale" },
    { md: "12-26", title: "Santo Stefano" },
  ];

  for (let year = from.getUTCFullYear(); year <= to.getUTCFullYear(); year += 1) {
    for (const f of fixed) {
      const date = `${year}-${f.md}`;
      const d = new Date(`${date}T00:00:00.000Z`);
      if (d >= from && d < to) {
        events.push({
          id: `holiday-${date}`,
          title: `Festivita: ${f.title}`,
          start: date,
          allDay: true,
          color: "#fee2e2",
          textColor: "#991b1b",
        });
      }
    }

    const pasqua = easterSunday(year);
    const pasquetta = addDays(pasqua, 1);
    if (pasqua >= from && pasqua < to) {
      events.push({
        id: `holiday-pasqua-${year}`,
        title: "Festivita: Pasqua",
        start: ymdUTC(pasqua),
        allDay: true,
        color: "#fee2e2",
        textColor: "#991b1b",
      });
    }
    if (pasquetta >= from && pasquetta < to) {
      events.push({
        id: `holiday-pasquetta-${year}`,
        title: "Festivita: Lunedi dell'Angelo",
        start: ymdUTC(pasquetta),
        allDay: true,
        color: "#fee2e2",
        textColor: "#991b1b",
      });
    }
  }

  return events;
}

function getOperatorsForDate(operators: Operator[], date: Date) {
  const dayKey = indexToDayKey[date.getDay()];
  return operators
    .filter((op) => Boolean(op.attivo ?? true))
    .flatMap((op) => {
      const row = (op.workingHoursJson as WorkingHoursJson | null | undefined)?.[dayKey];
      if (!row?.enabled) return [];
      return [{ id: op.id, nome: op.nome, start: row.start, end: row.end }];
    });
}

export function PlannerClient({
  treatments,
  workingHoursJson,
  whatsappConfig,
  currency,
  operators,
  branchSwitcher,
}: {
  treatments: Treatment[];
  workingHoursJson: WorkingHoursJson | null | undefined;
  whatsappConfig: {
    template: string | null;
    nomeAttivita: string;
    indirizzoAttivita: string;
  };
  currency: string;
  operators: Operator[];
  branchSwitcher: {
    currentSalonId: string;
    branches: Array<{ id: string; label: string }>;
  } | null;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [modalMode, setModalMode] = useState<"APPOINTMENT" | "NOTE">("APPOINTMENT");
  const [isNewClient, setIsNewClient] = useState<boolean | null>(null);
  const [slotStart, setSlotStart] = useState<Date | null>(null);
  const [slotDateInput, setSlotDateInput] = useState("");
  const [slotTimeInput, setSlotTimeInput] = useState("");
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [selectedDog, setSelectedDog] = useState<Cane | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Cliente[]>([]);
  const [dogs, setDogs] = useState<Cane[]>([]);
  const [durata, setDurata] = useState(60);
  const [note, setNote] = useState("");
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [visibleRange, setVisibleRange] = useState<{ from: string; to: string } | null>(null);
  const [title, setTitle] = useState("");
  const [jumpDate, setJumpDate] = useState("");
  const [desktopWeekStart, setDesktopWeekStart] = useState<Date>(startOfWeekMonday(new Date()));
  const [mobileDay, setMobileDay] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [switchingSalonId, setSwitchingSalonId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [incassoAmount, setIncassoAmount] = useState<string>("");
  const [incassoTipAmount, setIncassoTipAmount] = useState<string>("");
  const [incassoMethod, setIncassoMethod] = useState<"POS" | "CASH">("POS");
  const [incassoNote, setIncassoNote] = useState<string>("");
  const [listinoQuote, setListinoQuote] = useState<ListinoQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [pendingMoveAppointmentId, setPendingMoveAppointmentId] = useState<string | null>(null);
  const [copiedAppointmentId, setCopiedAppointmentId] = useState<string | null>(null);
  const [resizeDrag, setResizeDrag] = useState<{
    appointmentId: string;
    direction: "start" | "end";
    originY: number;
    baseStartMs: number;
    baseEndMs: number;
  } | null>(null);

  const [newClientForm, setNewClientForm] = useState({ nome: "", cognome: "", telefono: "", email: "", noteCliente: "", consensoPromemoria: true });
  const [newDogForm, setNewDogForm] = useState({ nome: "", razza: "", taglia: "M", noteCane: "", tagRapidiIds: [] as string[] });

  function openAppointmentEditor(appt: Appointment, fallbackOperatorId: string) {
    setSelectedAppointment(appt);
    setDurata((new Date(appt.endAt).getTime() - new Date(appt.startAt).getTime()) / 60000);
    setNote(appt.noteAppuntamento || "");
    setSelectedTreatments(appt.trattamentiSelezionati.map((t) => t.treatment.id));
    setSelectedOperatorId(appt.operator?.id || fallbackOperatorId);
    const currentStart = new Date(appt.startAt);
    setEditDate(toDateInputValue(currentStart));
    setEditTime(toTimeInputValue(currentStart));
    setShowEdit(true);
  }

  function maybeOpenWhatsappReminder(args: {
    clientPhone: string;
    clientName: string;
    dogName: string;
    startAt: Date;
  }) {
    const cleanedPhone = args.clientPhone.replace(/[^\d+]/g, "");
    if (!cleanedPhone) return;

    const fallbackTemplate =
      "Ciao %nome_cliente%, ti confermiamo l'appuntamento per %nome_pet% il %data_appuntamento% alle %orario_appuntamento% presso %nome_attivita% (%indirizzo_attivita%).";
    const base = (whatsappConfig.template || fallbackTemplate)
      .replaceAll("%nome_cliente%", args.clientName)
      .replaceAll("%nome_pet%", args.dogName)
      .replaceAll("%data_appuntamento%", format(args.startAt, "dd/MM/yyyy"))
      .replaceAll("%orario_appuntamento%", format(args.startAt, "HH:mm"))
      .replaceAll("%nome_attivita%", whatsappConfig.nomeAttivita || "")
      .replaceAll("%indirizzo_attivita%", whatsappConfig.indirizzoAttivita || "");

    if (!confirm("Appuntamento salvato. Vuoi inviare WhatsApp adesso?")) return;
    const popup = window.open("", "_blank");
    void sendWhatsappMessage(args.clientPhone, base, popup);
  }

  async function sendWhatsappMessage(phone: string, text: string, popup: Window | null = null) {
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, text }),
    });
    const data = await res.json();
    if (!res.ok) {
      popup?.close();
      alert(data.error || "Errore invio WhatsApp");
      return;
    }
    if (data.mode === "api") {
      popup?.close();
      alert("Messaggio inviato via WhatsApp API");
      return;
    }
    if (data.warning) {
      alert(data.warning);
    }
    if (data.url) {
      if (popup && !popup.closed) {
        popup.location.href = data.url;
        popup.focus();
        return;
      }
      window.open(data.url, "_blank");
      return;
    }
    popup?.close();
  }

  async function sendWhatsappFromEditModal() {
    if (!selectedAppointment) return;
    const fallbackTemplate =
      "Ciao %nome_cliente%, ti confermiamo l'appuntamento per %nome_pet% il %data_appuntamento% alle %orario_appuntamento% presso %nome_attivita% (%indirizzo_attivita%).";
    const startAt = new Date(selectedAppointment.startAt);
    const text = (whatsappConfig.template || fallbackTemplate)
      .replaceAll("%nome_cliente%", `${selectedAppointment.cliente.nome} ${selectedAppointment.cliente.cognome}`)
      .replaceAll("%nome_pet%", selectedAppointment.cane.nome)
      .replaceAll("%data_appuntamento%", format(startAt, "dd/MM/yyyy"))
      .replaceAll("%orario_appuntamento%", format(startAt, "HH:mm"))
      .replaceAll("%nome_attivita%", whatsappConfig.nomeAttivita || "")
      .replaceAll("%indirizzo_attivita%", whatsappConfig.indirizzoAttivita || "");
    const popup = window.open("", "_blank");
    await sendWhatsappMessage(selectedAppointment.cliente.telefono, text, popup);
  }

  async function switchSalon(nextSalonId: string) {
    if (!branchSwitcher || nextSalonId === branchSwitcher.currentSalonId) return;
    setSwitchingSalonId(nextSalonId);
    const res = await fetch("/api/active-salon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salonId: nextSalonId }),
    });
    if (!res.ok) {
      alert("Impossibile cambiare sede");
      setSwitchingSalonId(null);
      return;
    }
    window.location.reload();
  }

  const loadAppointments = useCallback(async (from?: string, to?: string) => {
    const now = new Date();
    const fromDate = from ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const toDate = to ?? new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    setVisibleRange({ from: fromDate, to: toDate });
    const res = await fetch(`/api/appointments?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`);
    const data = await res.json();
    setAppointments(data);
  }, []);

  useEffect(() => {
    if (isMobile) return;
    const start = new Date(desktopWeekStart);
    const end = endOfWeekMonday(start);
    setTitle(`${format(start, "dd MMM yyyy", { locale: dateFnsIt })} - ${format(end, "dd MMM yyyy", { locale: dateFnsIt })}`);
    loadAppointments(start.toISOString(), end.toISOString());
  }, [desktopWeekStart, isMobile, loadAppointments]);

  useEffect(() => {
    if (!isMobile) return;
    const start = new Date(mobileDay);
    start.setHours(0, 0, 0, 0);
    const end = new Date(mobileDay);
    end.setHours(23, 59, 59, 999);
    setTitle(format(start, "dd MMM yyyy", { locale: dateFnsIt }));
    loadAppointments(start.toISOString(), end.toISOString());
  }, [isMobile, mobileDay, loadAppointments]);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!search || isNewClient !== false) return;
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/clients?q=${encodeURIComponent(search)}`);
      const data = await res.json();
      setResults(data);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, isNewClient]);

  useEffect(() => {
    if (!showModal || !selectedDog) return;
    if (!selectedTreatments.length) {
      setListinoQuote(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const quote = await computeListinoQuote(selectedDog.id, selectedTreatments);
      if (!quote || cancelled) return;
      setDurata(quote.suggestedDuration);
    })();

    return () => {
      cancelled = true;
    };
  }, [showModal, selectedDog, selectedTreatments]);

  useEffect(() => {
    if (!slotStart) {
      setSlotDateInput("");
      setSlotTimeInput("");
      return;
    }
    setSlotDateInput(toDateInputValue(slotStart));
    setSlotTimeInput(toTimeInputValue(slotStart));
  }, [slotStart]);

  async function loadDogs(clienteId: string) {
    const res = await fetch(`/api/dogs?clienteId=${clienteId}`);
    const data = await res.json();
    setDogs(data);
  }

  async function createClientThenDog() {
    const cRes = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newClientForm),
    });
    const clientData = await cRes.json();
    if (!cRes.ok) {
      alert(clientData.error || "Errore creazione cliente");
      return;
    }

    setSelectedClient(clientData);

    const dRes = await fetch("/api/dogs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newDogForm, clienteId: clientData.id }),
    });
    const dogData = await dRes.json();
    if (!dRes.ok) {
      alert(dogData.error || "Errore creazione cane");
      return;
    }

    setSelectedDog(dogData);
    alert("Cliente e cane creati. Completa ora l'appuntamento.");
  }

  async function computeListinoQuote(caneId: string, trattamentoIds: string[]) {
    if (!trattamentoIds.length) {
      setListinoQuote(null);
      return null;
    }
    setQuoteLoading(true);
    try {
      const res = await fetch("/api/pricing-rules/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caneId, treatmentIds: trattamentoIds }),
      });
      const data = await res.json();
      if (!res.ok) return null;
      setListinoQuote(data);
      return data as ListinoQuote;
    } finally {
      setQuoteLoading(false);
    }
  }

  function isOverlapError(data: unknown) {
    if (!data || typeof data !== "object") return false;
    const error = (data as { error?: unknown }).error;
    return typeof error === "string" && error.toLowerCase().includes("sovrapposizione");
  }

  async function requestAppointmentWithOptionalOverlap(
    method: "POST" | "PATCH",
    payload: Record<string, unknown>,
    overlapPrompt: string,
  ) {
    const send = async (allowOverlap: boolean) =>
      fetch("/api/appointments", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, allowOverlap }),
      });

    let res = await send(false);
    let data = await res.json();

    if (!res.ok && isOverlapError(data) && confirm(overlapPrompt)) {
      res = await send(true);
      data = await res.json();
    }

    return { res, data };
  }

  async function saveAppointment() {
    if (!slotStart) return;
    const operatorIdForSave = selectedOperatorId;
    if (operators.length > 0 && !operatorIdForSave) {
      alert("Seleziona un operatore cliccando una colonna agenda");
      return;
    }

    if (modalMode === "NOTE") {
      if (!note.trim()) {
        alert("Inserisci il testo della nota");
        return;
      }
      const { res, data } = await requestAppointmentWithOptionalOverlap(
        "POST",
        {
          modalita: "NOTE",
          operatorId: operatorIdForSave || null,
          startAt: slotStart.toISOString(),
          durataMinuti: durata,
          noteAppuntamento: note.trim(),
        },
        "Esiste gia un appuntamento in questo orario. Vuoi salvare comunque la nota in sovrapposizione?",
      );
      if (!res.ok) {
        alert(data.error || "Errore creazione nota");
        return;
      }

      setShowModal(false);
      setModalMode("APPOINTMENT");
      setIsNewClient(null);
      setSelectedClient(null);
      setSelectedDog(null);
      setNote("");
      setDurata(60);
      setSelectedTreatments([]);
      setListinoQuote(null);
      if (visibleRange) {
        await loadAppointments(visibleRange.from, visibleRange.to);
      } else {
        await loadAppointments();
      }
      return;
    }

    if (!selectedClient || !selectedDog) return;
    const startForMessage = slotStart;
    const clientForMessage = selectedClient;
    const dogForMessage = selectedDog;
    const { res, data } = await requestAppointmentWithOptionalOverlap(
      "POST",
      {
        operatorId: operatorIdForSave || null,
        clienteId: selectedClient.id,
        caneId: selectedDog.id,
        startAt: slotStart.toISOString(),
        durataMinuti: durata,
        noteAppuntamento: note,
        trattamentiIds: selectedTreatments,
      },
      "Operatore gia occupato in questo orario. Vuoi salvare comunque l'appuntamento in sovrapposizione?",
    );
    if (!res.ok) {
      alert(data.error || "Errore creazione appuntamento");
      return;
    }

    maybeOpenWhatsappReminder({
      clientPhone: clientForMessage.telefono,
      clientName: `${clientForMessage.nome} ${clientForMessage.cognome}`,
      dogName: dogForMessage.nome,
      startAt: startForMessage,
    });

    setShowModal(false);
    setModalMode("APPOINTMENT");
    setIsNewClient(null);
    setSelectedClient(null);
    setSelectedDog(null);
    setNote("");
    setDurata(60);
    setSelectedTreatments([]);
    setListinoQuote(null);
    if (visibleRange) {
      await loadAppointments(visibleRange.from, visibleRange.to);
    } else {
      await loadAppointments();
    }
  }

  async function updateAppointment(payload: Record<string, unknown>) {
    if (!selectedAppointment) return;
    const { res, data } = await requestAppointmentWithOptionalOverlap(
      "PATCH",
      { appointmentId: selectedAppointment.id, ...payload },
      "Questo cambio crea una sovrapposizione. Vuoi confermare comunque?",
    );
    if (!res.ok) {
      alert(data.error || "Errore aggiornamento");
      return;
    }
    setShowEdit(false);
    if (visibleRange) {
      await loadAppointments(visibleRange.from, visibleRange.to);
    } else {
      await loadAppointments();
    }
  }

  async function moveAppointmentToSlot(appointmentId: string, targetStart: Date, targetOperatorId: string | null) {
    const appointment = appointments.find((a) => a.id === appointmentId);
    if (!appointment) return;
    const { res, data } = await requestAppointmentWithOptionalOverlap(
      "PATCH",
      {
        appointmentId,
        startAt: targetStart.toISOString(),
        operatorId: targetOperatorId,
      },
      "Lo slot di destinazione e gia occupato. Vuoi spostare comunque in sovrapposizione?",
    );
    if (!res.ok) {
      alert(data.error || "Errore spostamento appuntamento");
      return;
    }
    if (visibleRange) {
      await loadAppointments(visibleRange.from, visibleRange.to);
    } else {
      await loadAppointments();
    }
  }

  async function pasteAppointmentToSlot(appointmentId: string, targetStart: Date, targetOperatorId: string | null) {
    const source = appointments.find((a) => a.id === appointmentId);
    if (!source) return;
    const durataMinuti = Math.max(15, Math.round((new Date(source.endAt).getTime() - new Date(source.startAt).getTime()) / 60000));
    if (isPersonalNoteAppointment(source)) {
      const { res, data } = await requestAppointmentWithOptionalOverlap(
        "POST",
        {
          modalita: "NOTE",
          operatorId: targetOperatorId,
          startAt: targetStart.toISOString(),
          durataMinuti,
          noteAppuntamento: source.noteAppuntamento || "Nota personale",
        },
        "Lo slot e gia occupato. Vuoi incollare comunque la nota in sovrapposizione?",
      );
      if (!res.ok) {
        alert(data.error || "Errore incolla appuntamento");
        return;
      }
    } else {
      const { res, data } = await requestAppointmentWithOptionalOverlap(
        "POST",
        {
          operatorId: targetOperatorId,
          clienteId: source.cliente.id,
          caneId: source.cane.id,
          startAt: targetStart.toISOString(),
          durataMinuti,
          noteAppuntamento: source.noteAppuntamento || "",
          trattamentiIds: source.trattamentiSelezionati.map((t) => t.treatment.id),
        },
        "Lo slot e gia occupato. Vuoi incollare comunque l'appuntamento in sovrapposizione?",
      );
      if (!res.ok) {
        alert(data.error || "Errore incolla appuntamento");
        return;
      }
    }
    if (visibleRange) {
      await loadAppointments(visibleRange.from, visibleRange.to);
    } else {
      await loadAppointments();
    }
  }

  async function prefillIncassoFromListino(appt: Appointment) {
    if (isPersonalNoteAppointment(appt)) return;
    if ((appt.transactions?.length ?? 0) > 0) return;
    const treatmentIds = appt.trattamentiSelezionati.map((t) => t.treatment.id);
    if (!treatmentIds.length) return;
    const quote = await computeListinoQuote(appt.cane.id, treatmentIds);
    if (!quote) return;
    setIncassoAmount(quote.suggestedAmount.toFixed(2));
  }

  async function registraIncasso() {
    if (!selectedAppointment) return;
    const amount = Number(incassoAmount);
    const tipAmount = incassoTipAmount.trim() === "" ? 0 : Number(incassoTipAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Inserisci un importo valido");
      return;
    }
    if (!Number.isFinite(tipAmount) || tipAmount < 0) {
      alert("Inserisci una mancia valida");
      return;
    }
    await updateAppointment({
      transaction: {
        appointmentId: selectedAppointment.id,
        amount,
        tipAmount,
        method: incassoMethod,
        note: incassoNote || undefined,
      },
    });
    setIncassoAmount("");
    setIncassoTipAmount("");
    setIncassoNote("");
  }

  useEffect(() => {
    if (!resizeDrag) return;
    const slotPixelHeight = 36;
    let draftStartMs = resizeDrag.baseStartMs;
    let draftDuration = Math.max(15, Math.round((resizeDrag.baseEndMs - resizeDrag.baseStartMs) / 60000));
    let changed = false;

    const onPointerMove = (event: PointerEvent) => {
      const deltaSlots = Math.round((event.clientY - resizeDrag.originY) / slotPixelHeight);
      const deltaMinutes = deltaSlots * 30;
      const baseDuration = Math.max(15, Math.round((resizeDrag.baseEndMs - resizeDrag.baseStartMs) / 60000));
      if (resizeDrag.direction === "end") {
        draftStartMs = resizeDrag.baseStartMs;
        draftDuration = Math.max(15, Math.min(300, baseDuration + deltaMinutes));
      } else {
        const minStart = resizeDrag.baseEndMs - 300 * 60000;
        const maxStart = resizeDrag.baseEndMs - 15 * 60000;
        draftStartMs = Math.max(minStart, Math.min(maxStart, resizeDrag.baseStartMs + deltaMinutes * 60000));
        draftDuration = Math.max(15, Math.min(300, Math.round((resizeDrag.baseEndMs - draftStartMs) / 60000)));
      }
      changed = draftStartMs !== resizeDrag.baseStartMs || draftDuration !== baseDuration;
    };

    const onPointerUp = () => {
      const current = resizeDrag;
      setResizeDrag(null);
      if (!changed) return;
      void (async () => {
        const { res, data } = await requestAppointmentWithOptionalOverlap(
          "PATCH",
          {
            appointmentId: current.appointmentId,
            startAt: new Date(draftStartMs).toISOString(),
            durataMinuti: draftDuration,
          },
          "La nuova durata/orario crea una sovrapposizione. Vuoi confermare comunque?",
        );
        if (!res.ok) {
          alert(data.error || "Errore modifica durata appuntamento");
          return;
        }
        if (visibleRange) {
          await loadAppointments(visibleRange.from, visibleRange.to);
        } else {
          await loadAppointments();
        }
      })();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [loadAppointments, resizeDrag, visibleRange]);

  const desktopVisibleDayKeys = useMemo<DayKey[]>(() => {
    const ordered: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    const enabled = ordered.filter((key) => Boolean(workingHoursJson?.[key]?.enabled));
    if (enabled.length > 0) return enabled;
    return ["mon", "tue", "wed", "thu", "fri", "sat"];
  }, [workingHoursJson]);
  const matrixDays = useMemo(() => {
    if (isMobile) {
      const dayKey = indexToDayKey[mobileDay.getDay()];
      return [{ date: mobileDay, dayKey }];
    }
    return desktopVisibleDayKeys.map((dayKey) => {
      const date = new Date(desktopWeekStart);
      const offset = (dayKeyToIndex[dayKey] + 6) % 7;
      date.setDate(desktopWeekStart.getDate() + offset);
      return { date, dayKey };
    });
  }, [desktopVisibleDayKeys, desktopWeekStart, isMobile, mobileDay]);
  const matrixColumns = useMemo(() => {
    return matrixDays.map((d) => ({
      ...d,
      operators: getOperatorsForDate(operators, d.date),
    }));
  }, [matrixDays, operators]);
  const matrixSlots = useMemo(() => {
    const times = matrixColumns.flatMap((d) => d.operators.flatMap((op) => [toMinutes(op.start), toMinutes(op.end)]));
    if (!times.length) return [];
    const min = Math.min(...times);
    const max = Math.max(...times);
    const out: number[] = [];
    for (let t = min; t < max; t += 30) out.push(t);
    return out;
  }, [matrixColumns]);
  const matrixDayMinWidths = useMemo(
    () => matrixColumns.map((d) => Math.max(190, (d.operators.length || 1) * 145)),
    [matrixColumns],
  );
  const matrixTableMinWidth = useMemo(
    () => 72 + matrixDayMinWidths.reduce((sum, w) => sum + w, 0),
    [matrixDayMinWidths],
  );
  return (
    <Card className="space-y-4">
      {branchSwitcher ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-zinc-500">Sede</span>
          {branchSwitcher.branches.map((b) => {
            const active = b.id === branchSwitcher.currentSalonId;
            return (
              <Button
                key={b.id}
                variant={active ? "default" : "outline"}
                onClick={() => switchSalon(b.id)}
                disabled={Boolean(switchingSalonId)}
              >
                {b.label}
              </Button>
            );
          })}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={() => {
            if (isMobile) {
              const next = new Date(mobileDay);
              next.setDate(next.getDate() - 1);
              next.setHours(0, 0, 0, 0);
              setMobileDay(next);
              return;
            }
            const next = new Date(desktopWeekStart);
            next.setDate(next.getDate() - 7);
            setDesktopWeekStart(next);
          }}
        >
          {isMobile ? "Precedente" : "Settimana precedente"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (isMobile) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              setMobileDay(today);
              return;
            }
            setDesktopWeekStart(startOfWeekMonday(new Date()));
          }}
        >
          Oggi
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (isMobile) {
              const next = new Date(mobileDay);
              next.setDate(next.getDate() + 1);
              next.setHours(0, 0, 0, 0);
              setMobileDay(next);
              return;
            }
            const next = new Date(desktopWeekStart);
            next.setDate(next.getDate() + 7);
            setDesktopWeekStart(next);
          }}
        >
          {isMobile ? "Successiva" : "Settimana successiva"}
        </Button>
        <Input
          type="text"
          inputMode="numeric"
          placeholder="gg.mm.aaaa"
          className={isMobile ? "w-full" : "w-[180px]"}
          value={jumpDate}
          onChange={(e) => setJumpDate(e.target.value)}
        />
        <Button
          onClick={() => {
            if (!jumpDate) return;
            const parsed = parseJumpDateInput(jumpDate);
            if (!parsed) {
              alert("Data non valida. Usa formato gg.mm.aaaa");
              return;
            }
            if (isMobile) {
              const target = new Date(parsed);
              target.setHours(0, 0, 0, 0);
              setMobileDay(target);
            } else {
              setDesktopWeekStart(startOfWeekMonday(parsed));
            }
          }}
        >
          Cerca giorno
        </Button>
        <div className="w-full text-sm font-semibold md:ml-auto md:w-auto">{title}</div>
      </div>
      <div className="overflow-hidden">
        {(pendingMoveAppointmentId || copiedAppointmentId) ? (
          <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-zinc-700">
            {pendingMoveAppointmentId ? <span>Sposta attiva: tocca lo slot destinazione.</span> : null}
            {copiedAppointmentId ? <span>Copia attiva: tocca uno slot vuoto per incollare.</span> : null}
            <Button size="sm" variant="outline" onClick={() => setPendingMoveAppointmentId(null)}>Annulla sposta</Button>
            <Button size="sm" variant="outline" onClick={() => setCopiedAppointmentId(null)}>Annulla copia</Button>
          </div>
        ) : null}
        <div className="min-w-0">
        <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white" style={{ touchAction: "pan-x pan-y" }}>
          <table className="w-full border-collapse text-xs md:text-sm" style={{ minWidth: `${matrixTableMinWidth}px` }}>
            <thead>
              <tr>
                <th className="sticky left-0 z-20 w-[72px] border border-zinc-200 bg-zinc-50 p-2 text-left text-zinc-600">Ora</th>
                {matrixColumns.map((day, dayIndex) => (
                  <th
                    key={day.date.toISOString()}
                    className="border border-zinc-200 bg-zinc-50 p-2 text-center"
                    style={{ minWidth: `${matrixDayMinWidths[dayIndex]}px` }}
                  >
                    {capitalizeFirst(format(day.date, "EEEE dd/MM", { locale: dateFnsIt }))}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 z-20 border border-zinc-200 bg-zinc-50 p-2" />
                {matrixColumns.map((day, dayIndex) => (
                  <th
                    key={`${day.date.toISOString()}-ops`}
                    className="border border-zinc-200 bg-zinc-50 p-2 align-top"
                    style={{ minWidth: `${matrixDayMinWidths[dayIndex]}px` }}
                  >
                    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(1, day.operators.length)}, minmax(0, 1fr))` }}>
                      {(day.operators.length ? day.operators : [{ id: "none", nome: "Nessuno", start: "--:--", end: "--:--" }]).map((op) => (
                        <div key={`${day.date.toISOString()}-${op.id}`} className="rounded border border-zinc-200 bg-white px-1.5 py-1 text-[11px]">
                          <div className="font-semibold">{op.nome}</div>
                          <div className="text-zinc-500">{op.start}-{op.end}</div>
                        </div>
                      ))}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixSlots.map((slotMin) => (
                <tr key={slotMin}>
                  <td className="sticky left-0 z-10 border border-zinc-200 bg-zinc-50 p-1.5 align-top font-medium text-zinc-600">{formatHmFromMinutes(slotMin)}</td>
                  {matrixColumns.map((day, dayIndex) => (
                    <td
                      key={`${day.date.toISOString()}-${slotMin}`}
                      className="border-x border-zinc-200 p-0 align-top"
                      style={{ minWidth: `${matrixDayMinWidths[dayIndex]}px` }}
                    >
                      <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${Math.max(1, day.operators.length)}, minmax(0, 1fr))` }}>
                        {(day.operators.length ? day.operators : [{ id: "none", nome: "Nessuno", start: "--:--", end: "--:--" }]).map((op) => {
                          const slotStart = new Date(day.date);
                          slotStart.setHours(Math.floor(slotMin / 60), slotMin % 60, 0, 0);
                          const slotTime = slotStart.getTime();
                          const slotEndMs = slotTime + 30 * 60 * 1000;
                          const slotAppointments = appointments.filter((a) => {
                            if (a.operator?.id !== op.id) return false;
                            const aStart = new Date(a.startAt).getTime();
                            const aEnd = new Date(a.endAt).getTime();
                            return slotTime >= aStart && slotTime < aEnd;
                          });
                          const orderedSlotAppointments = [...slotAppointments].sort(
                            (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
                          );
                          const row = day.operators.find((o) => o.id === op.id);
                          const inShift = row ? slotMin >= toMinutes(row.start) && slotMin < toMinutes(row.end) : false;
                          const operatorAppointments = appointments.filter((a) => a.operator?.id === op.id);
                          return (
                            <div
                              key={`${day.date.toISOString()}-${op.id}-${slotMin}`}
                              className={`relative h-9 w-full ${
                                inShift ? "border border-zinc-200 bg-white" : "border border-zinc-100 bg-zinc-50"
                              }`}
                              onDragOver={(event) => {
                                if (!inShift || op.id === "none") return;
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";
                              }}
                              onDrop={async (event) => {
                                if (!inShift || op.id === "none") return;
                                event.preventDefault();
                                const draggedAppointmentId = event.dataTransfer.getData("text/plain");
                                if (!draggedAppointmentId) return;
                                await moveAppointmentToSlot(draggedAppointmentId, slotStart, op.id || null);
                              }}
                              onClick={() => {
                                if (resizeDrag) return;
                                if ((!inShift && orderedSlotAppointments.length === 0) || op.id === "none") return;
                                if (pendingMoveAppointmentId) {
                                  void moveAppointmentToSlot(pendingMoveAppointmentId, slotStart, op.id || null);
                                  setPendingMoveAppointmentId(null);
                                  return;
                                }
                                if (copiedAppointmentId) {
                                  void pasteAppointmentToSlot(copiedAppointmentId, slotStart, op.id || null);
                                  return;
                                }
                                if (orderedSlotAppointments.length === 0) {
                                  setSlotStart(slotStart);
                                  setSelectedOperatorId(op.id);
                                  setModalMode("APPOINTMENT");
                                  setListinoQuote(null);
                                  setNote("");
                                  setShowModal(true);
                                }
                              }}
                            >
                              {orderedSlotAppointments.map((appt, idx) => {
                                const apptStartMs = new Date(appt.startAt).getTime();
                                const apptEndMs = new Date(appt.endAt).getTime();
                                const apptStartsHere = apptStartMs === slotTime;
                                const apptContinuesBefore = apptStartMs < slotTime;
                                const apptContinuesAfter = apptEndMs > slotEndMs;
                                const apptBgColor = getAppointmentBgColor(appt);
                                const laneAppointments = operatorAppointments
                                  .filter((other) => {
                                    const otherStart = new Date(other.startAt).getTime();
                                    const otherEnd = new Date(other.endAt).getTime();
                                    return otherStart < apptEndMs && otherEnd > apptStartMs;
                                  })
                                  .sort((a, b) => {
                                    const aStart = new Date(a.startAt).getTime();
                                    const bStart = new Date(b.startAt).getTime();
                                    if (aStart !== bStart) return aStart - bStart;
                                    return a.id.localeCompare(b.id);
                                  });
                                const laneCount = Math.max(1, laneAppointments.length);
                                const laneIndex = Math.max(0, laneAppointments.findIndex((x) => x.id === appt.id));
                                const widthPct = 100 / laneCount;
                                return (
                                  <button
                                    type="button"
                                    key={appt.id}
                                    draggable={Boolean(apptStartsHere)}
                                    className={`absolute bottom-0 top-0 z-10 overflow-hidden px-1 text-left text-white transition ${
                                      apptContinuesBefore && apptContinuesAfter
                                        ? "-mb-px -mt-px rounded-none"
                                        : apptContinuesBefore
                                          ? "-mt-px rounded-b-sm rounded-t-none"
                                          : apptContinuesAfter
                                            ? "-mb-px rounded-b-none rounded-t-sm"
                                            : "rounded-sm"
                                    }`}
                                    style={{
                                      left: `calc(${laneIndex * widthPct}% + 1px)`,
                                      width: `calc(${widthPct}% - 2px)`,
                                      backgroundColor: apptBgColor,
                                      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.55)",
                                    }}
                                    onDragStart={(event) => {
                                      if (!apptStartsHere) return;
                                      event.dataTransfer.setData("text/plain", appt.id);
                                      event.dataTransfer.effectAllowed = "move";
                                    }}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openAppointmentEditor(appt, op.id);
                                    }}
                                  >
                                    {apptStartsHere ? (
                                      <>
                                        <span className="block truncate pt-0.5 text-[11px] font-bold leading-tight">
                                          {isPersonalNoteAppointment(appt) ? "Nota" : `${appt.cane.nome} / ${appt.cliente.nome}`}
                                        </span>
                                        <span className="block truncate text-[10px] font-medium leading-tight text-white/90">
                                          {format(new Date(appt.startAt), "HH:mm")} - {format(new Date(appt.endAt), "HH:mm")}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="block pt-0.5 text-[10px] font-semibold leading-tight text-white/70">in corso</span>
                                    )}
                                    {apptStartsHere ? (
                                      <span
                                        role="button"
                                        aria-label="Ridimensiona inizio appuntamento"
                                        className="absolute inset-x-1 top-0 h-1 cursor-ns-resize rounded-t-sm bg-white/75 opacity-0 transition-opacity hover:opacity-100"
                                        onPointerDown={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          setResizeDrag({
                                            appointmentId: appt.id,
                                            direction: "start",
                                            originY: event.clientY,
                                            baseStartMs: apptStartMs,
                                            baseEndMs: apptEndMs,
                                          });
                                        }}
                                      />
                                    ) : null}
                                    {((!apptStartsHere && !apptContinuesAfter) || (apptStartsHere && !apptContinuesAfter)) ? (
                                      <span
                                        role="button"
                                        aria-label="Ridimensiona fine appuntamento"
                                        className="absolute inset-x-1 bottom-0 h-1 cursor-ns-resize rounded-b-sm bg-white/75 opacity-0 transition-opacity hover:opacity-100"
                                        onPointerDown={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          setResizeDrag({
                                            appointmentId: appt.id,
                                            direction: "end",
                                            originY: event.clientY,
                                            baseStartMs: apptStartMs,
                                            baseEndMs: apptEndMs,
                                          });
                                        }}
                                      />
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      </div>

      {showModal ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-2 md:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <Card className="mx-auto my-0 w-full max-w-2xl overflow-y-auto p-3 md:my-4 md:max-h-[calc(100dvh-3rem)] md:p-4">
            <h3 className="mb-3 text-lg font-semibold">Nuovo Appuntamento</h3>
            <p className="text-sm text-zinc-600">Slot: {slotStart ? format(slotStart, "dd/MM/yyyy HH:mm") : "-"}</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <Input
                type="date"
                value={slotDateInput}
                onChange={(e) => {
                  const nextDate = e.target.value;
                  setSlotDateInput(nextDate);
                  const next = buildLocalDateTime(nextDate, slotTimeInput);
                  if (next) setSlotStart(next);
                }}
              />
              <Input
                type="time"
                value={slotTimeInput}
                onChange={(e) => {
                  const nextTime = e.target.value;
                  setSlotTimeInput(nextTime);
                  const next = buildLocalDateTime(slotDateInput, nextTime);
                  if (next) setSlotStart(next);
                }}
              />
            </div>
            {operators.length ? (
              <p className="mt-2 text-sm text-zinc-600">
                Operatore assegnato:{" "}
                <span className="font-medium text-zinc-900">
                  {operators.find((op) => op.id === selectedOperatorId)?.nome || "-"}
                </span>
              </p>
            ) : null}
            <div className="my-3 flex flex-wrap gap-2">
              <Button
                variant={modalMode === "APPOINTMENT" ? "default" : "outline"}
                onClick={() => setModalMode("APPOINTMENT")}
              >
                Appuntamento
              </Button>
              <Button
                variant={modalMode === "NOTE" ? "default" : "outline"}
                onClick={() => {
                  setModalMode("NOTE");
                  setIsNewClient(null);
                  setSelectedClient(null);
                  setSelectedDog(null);
                  setSelectedTreatments([]);
                  setListinoQuote(null);
                }}
              >
                Nota
              </Button>
            </div>

            {modalMode === "NOTE" ? (
              <div className="space-y-2 border-t border-zinc-200 pt-3">
                <label className="text-sm font-medium">Durata nota</label>
                <select className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm" value={durata} onChange={(e) => setDurata(Number(e.target.value))}>
                  {durations.map((d) => (
                    <option key={d} value={d}>
                      {d} minuti
                    </option>
                  ))}
                </select>
                <p className="text-xs text-zinc-500">Fine: {slotStart ? format(addMinutes(slotStart, durata), "HH:mm") : "-"}</p>
                <label className="text-sm font-medium">Testo nota</label>
                <Textarea
                  placeholder="Es. Dentista, chiusura straordinaria, pausa personale..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            ) : null}

            {modalMode === "APPOINTMENT" ? (
            <div className="my-3 flex flex-wrap gap-2">
              <Button variant={isNewClient === true ? "default" : "outline"} onClick={() => setIsNewClient(true)}>
                E un nuovo cliente? SI
              </Button>
              <Button variant={isNewClient === false ? "default" : "outline"} onClick={() => setIsNewClient(false)}>
                E un nuovo cliente? NO
              </Button>
            </div>
            ) : null}

            {modalMode === "APPOINTMENT" && isNewClient === true ? (
              <div className="space-y-2">
                <h4 className="font-medium">1) Crea Cliente</h4>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input placeholder="Nome" value={newClientForm.nome} onChange={(e) => setNewClientForm({ ...newClientForm, nome: e.target.value })} />
                  <Input placeholder="Cognome" value={newClientForm.cognome} onChange={(e) => setNewClientForm({ ...newClientForm, cognome: e.target.value })} />
                  <Input placeholder="Telefono" value={newClientForm.telefono} onChange={(e) => setNewClientForm({ ...newClientForm, telefono: e.target.value })} />
                  <Input placeholder="Email" value={newClientForm.email} onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })} />
                </div>
                <Textarea placeholder="Note cliente" value={newClientForm.noteCliente} onChange={(e) => setNewClientForm({ ...newClientForm, noteCliente: e.target.value })} />
                <h4 className="font-medium">2) Crea Cane</h4>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input placeholder="Nome cane" value={newDogForm.nome} onChange={(e) => setNewDogForm({ ...newDogForm, nome: e.target.value })} />
                  <Input placeholder="Razza" value={newDogForm.razza} onChange={(e) => setNewDogForm({ ...newDogForm, razza: e.target.value })} />
                  <select className="h-10 rounded-md border border-zinc-300 px-3 text-sm" value={newDogForm.taglia} onChange={(e) => setNewDogForm({ ...newDogForm, taglia: e.target.value })}>
                    <option value="XS">Taglia XS</option>
                    <option value="S">Taglia S</option>
                    <option value="M">Taglia M</option>
                    <option value="L">Taglia L</option>
                    <option value="XL">Taglia XL</option>
                    <option value="XXL">Taglia XXL</option>
                  </select>
                </div>
                <Textarea placeholder="Note cane" value={newDogForm.noteCane} onChange={(e) => setNewDogForm({ ...newDogForm, noteCane: e.target.value })} />
                <Button type="button" onClick={createClientThenDog}>
                  Salva cliente e cane
                </Button>
              </div>
            ) : null}

            {modalMode === "APPOINTMENT" && isNewClient === false ? (
              <div className="space-y-2">
                <h4 className="font-medium">1) Cerca Cliente</h4>
                <Input placeholder="Nome, telefono o email" value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="max-h-36 overflow-y-auto rounded border border-zinc-200">
                  {results.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      className="block w-full border-b border-zinc-100 p-2 text-left text-sm hover:bg-zinc-50"
                      onClick={() => {
                        setSelectedClient(c);
                        loadDogs(c.id);
                      }}
                    >
                      {c.nome} {c.cognome} - {c.telefono}
                    </button>
                  ))}
                </div>
                {selectedClient ? (
                  <>
                    <h4 className="font-medium">2) Seleziona Cane</h4>
                    <select className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm" onChange={(e) => setSelectedDog(dogs.find((d) => d.id === e.target.value) || null)}>
                      <option value="">Seleziona cane</option>
                      {dogs.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nome} {d.razza ? `(${d.razza})` : ""}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
              </div>
            ) : null}

            {modalMode === "APPOINTMENT" && selectedClient && selectedDog ? (
              <div className="mt-4 space-y-2 border-t border-zinc-200 pt-3">
                <p className="text-sm">
                  Cliente: {selectedClient.nome} {selectedClient.cognome} - Cane: {selectedDog.nome}
                </p>
                <label className="text-sm font-medium">Durata</label>
                <select className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm" value={durata} onChange={(e) => setDurata(Number(e.target.value))}>
                  {durations.map((d) => (
                    <option key={d} value={d}>
                      {d} minuti
                    </option>
                  ))}
                </select>
                <p className="text-xs text-zinc-500">Fine: {slotStart ? format(addMinutes(slotStart, durata), "HH:mm") : "-"}</p>
                {quoteLoading ? <p className="text-xs text-zinc-500">Calcolo automatico da listino in corso...</p> : null}
                {listinoQuote ? (
                  <p className="text-xs text-zinc-600">
                    Da listino: {listinoQuote.suggestedDuration} minuti, {listinoQuote.currency} {listinoQuote.suggestedAmount.toFixed(2)}.
                    Puoi modificare manualmente.
                  </p>
                ) : null}
                {listinoQuote?.missingTreatmentIds.length ? (
                  <p className="text-xs text-[#7a5a14]">
                    Alcuni trattamenti non hanno ancora una regola nel listino.
                  </p>
                ) : null}

                <label className="text-sm font-medium">Trattamenti</label>
                <div className="grid gap-2 md:grid-cols-2">
                  {treatments
                    .filter((t) => t.attivo)
                    .map((t) => (
                      <label key={t.id} className="flex items-center gap-2 rounded border border-zinc-200 p-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedTreatments.includes(t.id)}
                          onChange={(e) => {
                            setSelectedTreatments((prev) => (e.target.checked ? [...prev, t.id] : prev.filter((id) => id !== t.id)));
                          }}
                        />
                        {t.nome}
                      </label>
                    ))}
                </div>

                <label className="text-sm font-medium">Note appuntamento</label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Chiudi
              </Button>
              <Button
                onClick={saveAppointment}
                disabled={
                  (modalMode === "APPOINTMENT" ? !selectedClient || !selectedDog : !note.trim())
                }
              >
                {modalMode === "NOTE" ? "Salva nota" : "Salva appuntamento"}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {showEdit && selectedAppointment ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-2 md:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEdit(false);
          }}
        >
          <Card className="mx-auto my-0 w-full max-w-xl space-y-3 overflow-y-auto p-3 md:my-4 md:max-h-[calc(100dvh-3rem)] md:p-4">
            <h3 className="text-lg font-semibold">Modifica Appuntamento</h3>
            <p className="text-sm">
              {isPersonalNoteAppointment(selectedAppointment)
                ? "Nota personale"
                : `${selectedAppointment.cane.nome} - ${selectedAppointment.cliente.nome} ${selectedAppointment.cliente.cognome}`}
            </p>
            {operators.length ? (
              <select
                className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
                value={selectedOperatorId}
                onChange={(e) => setSelectedOperatorId(e.target.value)}
              >
                <option value="">Senza operatore</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.nome}
                  </option>
                ))}
              </select>
            ) : null}
            <div className="grid gap-2 md:grid-cols-2">
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
            </div>
            <select className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm" value={durata} onChange={(e) => setDurata(Number(e.target.value))}>
              {durations.map((d) => (
                <option key={d} value={d}>
                  {d} minuti
                </option>
              ))}
            </select>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  const nextStart = buildLocalDateTime(editDate, editTime);
                  if (!nextStart) {
                    alert("Data/ora non valida");
                    return;
                  }
                  void updateAppointment({
                    startAt: nextStart.toISOString(),
                    durataMinuti: durata,
                    noteAppuntamento: note,
                    operatorId: selectedOperatorId || null,
                  });
                }}
              >
                Salva
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPendingMoveAppointmentId(selectedAppointment.id);
                  setShowEdit(false);
                }}
              >
                Sposta con tap
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCopiedAppointmentId(selectedAppointment.id);
                  alert("Appuntamento copiato. Tocca uno slot vuoto per incollare.");
                }}
              >
                Copia appuntamento
              </Button>
              <Button variant="outline" onClick={sendWhatsappFromEditModal}>
                Invia WhatsApp
              </Button>
              <Button variant="outline" onClick={() => updateAppointment({ stato: "COMPLETATO" })}>
                Completa
              </Button>
              <Button variant="outline" onClick={() => updateAppointment({ stato: "NO_SHOW" })}>
                No-show
              </Button>
              <Button
                variant="destructive"
                disabled={(selectedAppointment.transactions?.length ?? 0) > 0}
                onClick={() => {
                  if ((selectedAppointment.transactions?.length ?? 0) > 0) return;
                  if (confirm("Confermi cancellazione?")) updateAppointment({ stato: "CANCELLATO" });
                }}
              >
                Cancella
              </Button>
            </div>
            {!isPersonalNoteAppointment(selectedAppointment) ? (
            <div className="border-t border-zinc-200 pt-3">
              <p className="mb-2 text-sm font-medium">Registra incasso</p>
              <div className="grid gap-2 md:grid-cols-4">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={`Importo (${currency})`}
                  value={incassoAmount}
                  onChange={(e) => setIncassoAmount(e.target.value)}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={`Mancia (${currency})`}
                  value={incassoTipAmount}
                  onChange={(e) => setIncassoTipAmount(e.target.value)}
                />
                <select
                  className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
                  value={incassoMethod}
                  onChange={(e) => setIncassoMethod(e.target.value as "POS" | "CASH")}
                >
                  <option value="POS">POS</option>
                  <option value="CASH">Contanti</option>
                </select>
                <Button onClick={registraIncasso}>Registra incasso</Button>
              </div>
              <Textarea
                className="mt-2"
                placeholder="Nota incasso (opzionale)"
                value={incassoNote}
                onChange={(e) => setIncassoNote(e.target.value)}
              />
              <p className="mt-2 text-xs text-zinc-500">
                Importo precompilato dal listino quando disponibile. Puoi modificarlo liberamente per sconti o variazioni.
              </p>
            </div>
            ) : null}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowEdit(false)}>
                Chiudi
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </Card>
  );
}
