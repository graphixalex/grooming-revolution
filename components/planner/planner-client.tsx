"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import itLocale from "@fullcalendar/core/locales/it";
import { addMinutes, format } from "date-fns";
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
  cliente: { nome: string; cognome: string; telefono: string };
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

const durations = Array.from({ length: 20 }, (_, i) => (i + 1) * 15);
const dayKeyToIndex: Record<DayKey, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

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
  const calendarRef = useRef<FullCalendar | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [modalMode, setModalMode] = useState<"APPOINTMENT" | "NOTE">("APPOINTMENT");
  const [isNewClient, setIsNewClient] = useState<boolean | null>(null);
  const [slotStart, setSlotStart] = useState<Date | null>(null);
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
  const [operatorBoardDate, setOperatorBoardDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [switchingSalonId, setSwitchingSalonId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [incassoAmount, setIncassoAmount] = useState<string>("");
  const [incassoTipAmount, setIncassoTipAmount] = useState<string>("");
  const [incassoMethod, setIncassoMethod] = useState<"POS" | "CASH">("POS");
  const [incassoNote, setIncassoNote] = useState<string>("");
  const [listinoQuote, setListinoQuote] = useState<ListinoQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>(operators[0]?.id || "");
  const [agendaOperatorFilter, setAgendaOperatorFilter] = useState<string>("ALL");

  useEffect(() => {
    if (!selectedOperatorId && operators.length) {
      setSelectedOperatorId(operators[0].id);
    }
  }, [operators, selectedOperatorId]);

  const [newClientForm, setNewClientForm] = useState({ nome: "", cognome: "", telefono: "", email: "", noteCliente: "", consensoPromemoria: true });
  const [newDogForm, setNewDogForm] = useState({ nome: "", razza: "", taglia: "M", noteCane: "", tagRapidiIds: [] as string[] });

  const hoursConfig = useMemo(() => {
    const selected = operators.find((o) => o.id === agendaOperatorFilter);
    return getWorkingHoursConfig((selected?.workingHoursJson as WorkingHoursJson | null | undefined) ?? workingHoursJson);
  }, [agendaOperatorFilter, operators, workingHoursJson]);

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

    if (confirm("Appuntamento salvato. Vuoi aprire WhatsApp con il messaggio preimpostato?")) {
      const url = `https://wa.me/${cleanedPhone.replace("+", "")}?text=${encodeURIComponent(base)}`;
      window.open(url, "_blank");
    }
  }

  function sendWhatsappFromEditModal() {
    if (!selectedAppointment) return;
    maybeOpenWhatsappReminder({
      clientPhone: selectedAppointment.cliente.telefono,
      clientName: `${selectedAppointment.cliente.nome} ${selectedAppointment.cliente.cognome}`,
      dogName: selectedAppointment.cane.nome,
      startAt: new Date(selectedAppointment.startAt),
    });
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
    const operatorQuery = agendaOperatorFilter !== "ALL" ? `&operatorId=${encodeURIComponent(agendaOperatorFilter)}` : "";
    const res = await fetch(`/api/appointments?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}${operatorQuery}`);
    const data = await res.json();
    setAppointments(data);
  }, [agendaOperatorFilter]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const targetView = isMobile ? "timeGridDay" : "timeGridWeek";
    if (api.view.type !== targetView) {
      api.changeView(targetView);
    }
  }, [isMobile]);

  useEffect(() => {
    const shouldLockBodyScroll = showModal || showEdit;
    if (!shouldLockBodyScroll) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showModal, showEdit]);

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

  async function saveAppointment() {
    if (!slotStart) return;

    if (modalMode === "NOTE") {
      if (!note.trim()) {
        alert("Inserisci il testo della nota");
        return;
      }
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modalita: "NOTE",
          operatorId: selectedOperatorId || null,
          startAt: slotStart.toISOString(),
          durataMinuti: durata,
          noteAppuntamento: note.trim(),
        }),
      });
      const data = await res.json();
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
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorId: selectedOperatorId || null,
        clienteId: selectedClient.id,
        caneId: selectedDog.id,
        startAt: slotStart.toISOString(),
        durataMinuti: durata,
        noteAppuntamento: note,
        trattamentiIds: selectedTreatments,
      }),
    });

    const data = await res.json();
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
    const res = await fetch("/api/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: selectedAppointment.id, ...payload }),
    });
    const data = await res.json();
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

  const appointmentEvents = useMemo(
    () =>
      appointments.map((a) => ({
        id: a.id,
        start: a.startAt,
        end: a.endAt,
        title: isPersonalNoteAppointment(a)
          ? `Nota: ${a.noteAppuntamento || "Impegno personale"}`
          : `${a.cane.nome}${a.cane.razza ? ` (${a.cane.razza})` : ""} - ${a.cliente.nome} ${a.cliente.cognome}${a.operator?.nome ? ` · ${a.operator.nome}` : ""}`,
        extendedProps: {
          note: a.noteAppuntamento,
          treatments: isPersonalNoteAppointment(a) ? "" : a.trattamentiSelezionati.map((t) => t.treatment.nome).join(", "),
          stato: a.stato,
          paid: (a.transactions?.length ?? 0) > 0,
        },
        backgroundColor:
          a.stato === "CANCELLATO"
            ? "#9ca3af"
            : a.stato === "NO_SHOW"
              ? "#ef4444"
              : (a.transactions?.length ?? 0) > 0
                ? "#22c55e"
                : a.operator?.color || "#f59e0b",
      })),
    [appointments],
  );

  const holidayEvents = useMemo(() => {
    if (!visibleRange) return [];
    return getItalianHolidayEvents(visibleRange.from, visibleRange.to);
  }, [visibleRange]);

  const allEvents = useMemo(() => [...appointmentEvents, ...holidayEvents], [appointmentEvents, holidayEvents]);
  const operatorBoard = useMemo(() => {
    if (!operators.length || !operatorBoardDate) return [];
    const start = new Date(`${operatorBoardDate}T00:00:00`);
    const end = new Date(`${operatorBoardDate}T23:59:59`);
    return operators.map((op) => {
      const rows = appointments
        .filter((a) => a.operator?.id === op.id && new Date(a.startAt) >= start && new Date(a.startAt) <= end)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      return { operator: op, rows };
    });
  }, [appointments, operatorBoardDate, operators]);

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
      {operators.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-zinc-500">Operatore in agenda</span>
          <Button
            variant={agendaOperatorFilter === "ALL" ? "default" : "outline"}
            onClick={() => setAgendaOperatorFilter("ALL")}
          >
            Tutti
          </Button>
          {operators.map((op) => (
            <Button
              key={op.id}
              variant={agendaOperatorFilter === op.id ? "default" : "outline"}
              onClick={() => setAgendaOperatorFilter(op.id)}
            >
              {op.nome}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => calendarRef.current?.getApi().prev()}>
          {isMobile ? "Precedente" : "Settimana precedente"}
        </Button>
        <Button variant="outline" onClick={() => calendarRef.current?.getApi().today()}>
          Oggi
        </Button>
        <Button variant="outline" onClick={() => calendarRef.current?.getApi().next()}>
          {isMobile ? "Successiva" : "Settimana successiva"}
        </Button>
        <Input
          type="date"
          className={isMobile ? "w-full" : "w-[180px]"}
          value={jumpDate}
          onChange={(e) => setJumpDate(e.target.value)}
        />
        <Button
          onClick={() => {
            if (!jumpDate) return;
            calendarRef.current?.getApi().gotoDate(jumpDate);
          }}
        >
          Cerca giorno
        </Button>
        <div className="w-full text-sm font-semibold md:ml-auto md:w-auto">{title}</div>
      </div>
      {operators.length ? (
        <Card className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">Agenda operatori (giorno)</h3>
            <Input
              type="date"
              className="w-[180px]"
              value={operatorBoardDate}
              onChange={(e) => setOperatorBoardDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {operatorBoard.map((col) => (
              <div key={col.operator.id} className="rounded-md border border-zinc-200 p-3">
                <p className="font-medium">{col.operator.nome}</p>
                <div className="mt-2 space-y-1 text-sm">
                  {col.rows.length === 0 ? (
                    <p className="text-zinc-500">Nessun appuntamento</p>
                  ) : (
                    col.rows.map((r) => (
                      <p key={r.id}>
                        {format(new Date(r.startAt), "HH:mm")} - {format(new Date(r.endAt), "HH:mm")} |{" "}
                        {isPersonalNoteAppointment(r) ? `Nota: ${r.noteAppuntamento || ""}` : `${r.cane.nome} / ${r.cliente.nome}`}
                      </p>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="overflow-hidden">
        <div className="min-w-0">
      <FullCalendar
        key={isMobile ? "fc-mobile" : "fc-desktop"}
        ref={calendarRef}
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
        locale={itLocale}
        firstDay={1}
        height="auto"
        weekNumbers={!isMobile}
        buttonText={{ today: "Oggi", month: "Mese", week: "Settimana", day: "Giorno" }}
        headerToolbar={
          isMobile
            ? false
            : { left: "timeGridDay,timeGridWeek,dayGridMonth", center: "", right: "" }
        }
        slotMinTime={hoursConfig.slotMinTime}
        slotMaxTime={hoursConfig.slotMaxTime}
        allDaySlot={false}
        businessHours={hoursConfig.businessHours}
        selectable
        selectLongPressDelay={120}
        eventLongPressDelay={120}
        datesSet={(info: { start: Date; end: Date; view: { title: string } }) => {
          setTitle(info.view.title);
          loadAppointments(info.start.toISOString(), info.end.toISOString());
        }}
        dateClick={(info: { date: Date; allDay: boolean }) => {
          if (showModal || showEdit || info.allDay) return;
          setSlotStart(info.date);
          setModalMode("APPOINTMENT");
          setSelectedOperatorId(agendaOperatorFilter !== "ALL" ? agendaOperatorFilter : operators[0]?.id || "");
          setListinoQuote(null);
          setNote("");
          setShowModal(true);
        }}
        select={(info: { start: Date }) => {
          setSlotStart(info.start);
          setModalMode("APPOINTMENT");
          setSelectedOperatorId(agendaOperatorFilter !== "ALL" ? agendaOperatorFilter : operators[0]?.id || "");
          setListinoQuote(null);
          setNote("");
          setShowModal(true);
        }}
        events={allEvents}
        eventClick={(info: { event: { id: string } }) => {
          const appt = appointments.find((a) => a.id === info.event.id);
          if (appt) {
            setSelectedAppointment(appt);
            setDurata((new Date(appt.endAt).getTime() - new Date(appt.startAt).getTime()) / 60000);
            setNote(appt.noteAppuntamento || "");
            setSelectedTreatments(appt.trattamentiSelezionati.map((t) => t.treatment.id));
            setSelectedOperatorId(appt.operator?.id || operators[0]?.id || "");
            setIncassoAmount("");
            setIncassoTipAmount("");
            setIncassoNote("");
            setShowEdit(true);
            setListinoQuote(null);
            void prefillIncassoFromListino(appt);
          }
        }}
        eventContent={(arg: { event: { title: string; extendedProps: Record<string, unknown> } }) => (
          <div className="relative pr-4 text-xs">
            <div className="font-semibold">{arg.event.title}</div>
            <div>{String(arg.event.extendedProps.treatments || "")}</div>
            <div className="truncate">{String(arg.event.extendedProps.note || "")}</div>
            {Boolean(arg.event.extendedProps.paid) ? <div className="absolute bottom-0 right-0 text-sm font-bold">€</div> : null}
          </div>
        )}
      />
        </div>
      </div>

      {showModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-2 md:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <Card className="max-h-[88vh] w-full max-w-2xl overflow-y-auto p-3 md:max-h-[96vh] md:p-4">
            <h3 className="mb-3 text-lg font-semibold">Nuovo Appuntamento</h3>
            <p className="text-sm text-zinc-600">Slot: {slotStart ? format(slotStart, "dd/MM/yyyy HH:mm") : "-"}</p>
            {operators.length ? (
              <div className="mt-2 space-y-1">
                <label className="text-sm font-medium">Operatore</label>
                <select
                  className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
                  value={selectedOperatorId}
                  onChange={(e) => setSelectedOperatorId(e.target.value)}
                >
                  <option value="">Seleziona operatore</option>
                  {operators.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.nome}
                    </option>
                  ))}
                </select>
              </div>
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
                  <p className="text-xs text-amber-700">
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
                  (operators.length > 0 && !selectedOperatorId) ||
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
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-2 md:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEdit(false);
          }}
        >
          <Card className="max-h-[88vh] w-full max-w-xl space-y-3 overflow-y-auto p-3 md:max-h-[96vh] md:p-4">
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
            <select className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm" value={durata} onChange={(e) => setDurata(Number(e.target.value))}>
              {durations.map((d) => (
                <option key={d} value={d}>
                  {d} minuti
                </option>
              ))}
            </select>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => updateAppointment({ durataMinuti: durata, noteAppuntamento: note, operatorId: selectedOperatorId || null })}>Salva</Button>
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

