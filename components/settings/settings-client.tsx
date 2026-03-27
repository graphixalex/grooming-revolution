"use client";

import Link from "next/link";
import { useState } from "react";
import { COUNTRY_OPTIONS, getCountryMeta } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type DayHours = {
  enabled: boolean;
  start: string;
  end: string;
  hasBreak: boolean;
  breakStart: string;
  breakEnd: string;
};

type WorkingHoursState = Record<DayKey, DayHours>;
type ExceptionHours = {
  id: string;
  date: string;
  enabled: boolean;
  start: string;
  end: string;
  hasBreak: boolean;
  breakStart: string;
  breakEnd: string;
};
const dayOrder: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const dayLabel: Record<DayKey, string> = {
  mon: "Lunedi",
  tue: "Martedi",
  wed: "Mercoledi",
  thu: "Giovedi",
  fri: "Venerdi",
  sat: "Sabato",
  sun: "Domenica",
};

function normalizeWorkingHours(input: any): WorkingHoursState {
  const out = {} as WorkingHoursState;
  for (const day of dayOrder) {
    const row = input?.[day];
    const firstBreak = row?.breaks?.[0];
    out[day] = {
      enabled: Boolean(row?.enabled),
      start: row?.start ?? "09:00",
      end: row?.end ?? "18:00",
      hasBreak: Boolean(firstBreak?.start && firstBreak?.end),
      breakStart: firstBreak?.start ?? "",
      breakEnd: firstBreak?.end ?? "",
    };
  }
  return out;
}

function normalizeOperatorExceptions(input: any): ExceptionHours[] {
  const source = input?.exceptions && typeof input.exceptions === "object" ? input.exceptions : {};
  return Object.entries(source)
    .map(([date, raw]: [string, any]) => {
      const firstBreak = raw?.breaks?.[0];
      return {
        id: `${date}-${Math.random().toString(36).slice(2, 7)}`,
        date,
        enabled: Boolean(raw?.enabled),
        start: raw?.start ?? "09:00",
        end: raw?.end ?? "18:00",
        hasBreak: Boolean(firstBreak?.start && firstBreak?.end),
        breakStart: firstBreak?.start ?? "",
        breakEnd: firstBreak?.end ?? "",
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function toWorkingHoursJson(state: WorkingHoursState, exceptions: ExceptionHours[] = []) {
  const out: Record<string, any> = {};
  for (const day of dayOrder) {
    const row = state[day];
    const hasBreak = row.hasBreak && row.breakStart && row.breakEnd;
    out[day] = {
      enabled: row.enabled,
      start: row.start,
      end: row.end,
      breaks: hasBreak ? [{ start: row.breakStart, end: row.breakEnd }] : [],
    };
  }
  const filteredExceptions = exceptions
    .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (filteredExceptions.length) {
    out.exceptions = Object.fromEntries(
      filteredExceptions.map((x) => [
        x.date,
        {
          enabled: x.enabled,
          start: x.start,
          end: x.end,
          breaks: x.hasBreak && x.breakStart && x.breakEnd ? [{ start: x.breakStart, end: x.breakEnd }] : [],
        },
      ]),
    );
  }
  return out;
}

export function SettingsClient({ initial }: { initial: any }) {
  const [salon, setSalon] = useState(initial.salon);
  const [tags, setTags] = useState(initial.tags);
  const [treatments, setTreatments] = useState(initial.treatments);
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("Password123!");
  const [staffRole, setStaffRole] = useState<"MANAGER" | "STAFF">("MANAGER");
  const [staffSalonId, setStaffSalonId] = useState<string>(initial.assignableSalons?.[0]?.id || initial.salon?.id || "");
  const [staff, setStaff] = useState(
    (initial.staff || []).map((s: any) => ({
      ...s,
      canAccessGroupSalons: Boolean(s.canAccessGroupSalons),
      password: "",
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
      showCurrentPassword: false,
      showNewPassword: false,
      showConfirmPassword: false,
    })),
  );
  const [operators, setOperators] = useState(
    (initial.operators || []).map((o: any, idx: number) => ({
      id: o.id,
      nome: o.nome || "",
      attivo: Boolean(o.attivo),
      ordine: o.ordine ?? idx,
      color: o.color || "#2563eb",
      agendaColumns: String(Math.max(1, Math.min(10, Number(o.agendaColumns) || 1))),
      kpiTargetRevenue: o.kpiTargetRevenue != null ? String(o.kpiTargetRevenue) : "",
      kpiTargetAppointments: o.kpiTargetAppointments != null ? String(o.kpiTargetAppointments) : "",
      workingHours: normalizeWorkingHours(o.workingHoursJson),
      exceptions: normalizeOperatorExceptions(o.workingHoursJson),
    })),
  );
  const [bookingLinkCopied, setBookingLinkCopied] = useState(false);
  const [deleteConfirmWord, setDeleteConfirmWord] = useState("");
  const [deleteRequestLoading, setDeleteRequestLoading] = useState(false);

  async function saveSection(section: string, payload: Record<string, unknown>) {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore salvataggio");
      return null;
    }
    alert(data.warning || "Salvato");
    return data;
  }

  async function createTeamUser() {
    const allGroupSalons = staffSalonId === "__ALL__";
    const created = await saveSection("staff", {
      email: staffEmail,
      password: staffPassword,
      role: staffRole,
      salonId: allGroupSalons ? (initial.salon?.id || initial.assignableSalons?.[0]?.id || "") : staffSalonId,
      canAccessGroupSalons: allGroupSalons,
    });
    if (!created) return;
    setStaff((prev: any[]) => [
      ...prev,
      {
        ...created,
        canAccessGroupSalons: Boolean(created.canAccessGroupSalons),
        password: "",
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
        showCurrentPassword: false,
        showNewPassword: false,
        showConfirmPassword: false,
      },
    ]);
    setStaffEmail("");
    setStaffPassword("Password123!");
  }

  async function saveTeamUser(row: any) {
    const isOwnerSelf = row.ruolo === "OWNER" && row.id === initial.currentUserId;
    if (isOwnerSelf) {
      const currentPassword = String(row.currentPassword || "");
      const newPassword = String(row.newPassword || "");
      const confirmNewPassword = String(row.confirmNewPassword || "");
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        alert("Compila vecchia password, nuova password e conferma");
        return;
      }
      if (newPassword !== confirmNewPassword) {
        alert("La conferma password non coincide");
        return;
      }
      const updated = await saveSection("ownerPassword", {
        currentPassword,
        newPassword,
        confirmNewPassword,
      });
      if (!updated) return;
      setStaff((prev: any[]) =>
        prev.map((x) =>
          x.id === row.id
            ? { ...x, currentPassword: "", newPassword: "", confirmNewPassword: "", showCurrentPassword: false, showNewPassword: false, showConfirmPassword: false }
            : x,
        ),
      );
      return;
    }

    const updated = await saveSection("staffUpdate", {
      userId: row.id,
      email: row.email,
      role: row.ruolo,
      salonId: row.salon?.id,
      canAccessGroupSalons: Boolean(row.canAccessGroupSalons),
      password: row.password || "",
    });
    if (!updated) return;
    setStaff((prev: any[]) => prev.map((x) => (x.id === row.id ? { ...updated, canAccessGroupSalons: Boolean(updated.canAccessGroupSalons), password: "" } : x)));
  }

  async function deleteTeamUser(row: any) {
    if (!confirm(`Confermi eliminazione utente ${row.email}?`)) return;
    const result = await saveSection("staffDelete", { userId: row.id });
    if (!result) return;
    setStaff((prev: any[]) => prev.filter((x) => x.id !== row.id));
  }

  async function copyBookingLink() {
    if (!salon.bookingSlug || typeof window === "undefined") return;
    const fullLink = `${window.location.origin}/book/${salon.bookingSlug}`;
    try {
      await navigator.clipboard.writeText(fullLink);
      setBookingLinkCopied(true);
      window.setTimeout(() => setBookingLinkCopied(false), 1800);
    } catch {
      alert("Impossibile copiare il link. Copialo manualmente.");
    }
  }

  async function requestAccountDeletion() {
    if (initial.role !== "OWNER") return;
    if (deleteConfirmWord.trim().toUpperCase() !== "ELIMINA") {
      alert("Per confermare inserisci ELIMINA");
      return;
    }
    if (
      !confirm(
        "Confermi invio richiesta eliminazione account? L'operazione finale sara irreversibile dopo conferma del team.",
      )
    ) {
      return;
    }
    setDeleteRequestLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "accountDeletionRequest",
          confirmWord: deleteConfirmWord,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Errore invio richiesta");
        return;
      }
      alert(data.message || "Richiesta inviata");
      setDeleteConfirmWord("");
    } finally {
      setDeleteRequestLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <h2 className="font-semibold">Dati attività</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <Input value={salon.nomeAttivita || ""} onChange={(e) => setSalon({ ...salon, nomeAttivita: e.target.value })} placeholder="Nome attività" />
          <select
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
            value={salon.paese || "IT"}
            onChange={(e) => {
              const nextCountry = e.target.value;
              const meta = getCountryMeta(nextCountry);
              setSalon({ ...salon, paese: meta.code, valuta: meta.currency });
            }}
          >
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <Input value={salon.valuta || ""} readOnly placeholder="Valuta automatica" />
          <Input value={salon.timezone || ""} onChange={(e) => setSalon({ ...salon, timezone: e.target.value })} placeholder="Timezone" />
          <Input value={salon.indirizzo || ""} onChange={(e) => setSalon({ ...salon, indirizzo: e.target.value })} placeholder="Indirizzo" />
          <Input value={salon.telefono || ""} onChange={(e) => setSalon({ ...salon, telefono: e.target.value })} placeholder="Telefono" />
          <Input value={salon.email || ""} onChange={(e) => setSalon({ ...salon, email: e.target.value })} placeholder="Email" />
          <Input value={salon.billingVatNumber || ""} onChange={(e) => setSalon({ ...salon, billingVatNumber: e.target.value })} placeholder="Partita IVA" />
          <Input value={salon.bookingSlug || ""} onChange={(e) => setSalon({ ...salon, bookingSlug: e.target.value })} placeholder="Slug booking (es. cecilia-luxury)" />
          <Input value={salon.bookingDisplayName || ""} onChange={(e) => setSalon({ ...salon, bookingDisplayName: e.target.value })} placeholder="Nome pubblico booking" />
          <Input value={salon.bookingLogoUrl || ""} onChange={(e) => setSalon({ ...salon, bookingLogoUrl: e.target.value })} placeholder="URL logo booking (opzionale)" />
        </div>
        <Textarea
          value={salon.bookingDescription || ""}
          onChange={(e) => setSalon({ ...salon, bookingDescription: e.target.value })}
          placeholder="Descrizione breve pagina booking"
        />
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Booking online pubblico</p>
              <p className="text-xs text-zinc-600">
                Attiva la pagina per permettere ai clienti di inviare richieste direttamente in agenda, senza overbooking.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800">
              <input
                type="checkbox"
                checked={Boolean(salon.bookingEnabled)}
                onChange={(e) => setSalon({ ...salon, bookingEnabled: e.target.checked })}
              />
              {salon.bookingEnabled ? "Online" : "Offline"}
            </label>
          </div>
          <p className="text-xs text-zinc-600">
            Se disattivi il booking, il link pubblico va offline. Se lo riattivi, torna disponibile con la stessa configurazione.
          </p>
          {salon.bookingSlug ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-2">
              <p className="text-xs text-zinc-500">Link pubblico booking</p>
              <a className="break-all text-sm font-medium text-zinc-800 underline" href={`/book/${salon.bookingSlug}`} target="_blank" rel="noreferrer">
                {`/book/${salon.bookingSlug}`}
              </a>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={copyBookingLink}>
                  {bookingLinkCopied ? "Link copiato" : "Copia link"}
                </Button>
                <a
                  href={`/book/${salon.bookingSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50"
                >
                  Apri pagina booking
                </a>
              </div>
            </div>
          ) : (
            <p className="text-xs text-amber-700">
              Imposta uno slug booking per generare il link pubblico (esempio: cecilia-luxury).
            </p>
          )}
        </div>
        <Button onClick={() => saveSection("salon", salon)}>Salva dati attività</Button>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Operatori e KPI</h2>
        <p className="text-sm text-zinc-600">
          Crea gli operatori della sede, definisci i loro orari e imposta target KPI mensili.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(salon.overlapAllowed)} onChange={(e) => setSalon({ ...salon, overlapAllowed: e.target.checked })} />
          Consenti sovrapposizioni appuntamenti
        </label>
        {operators.map((op: any, opIndex: number) => (
          <div key={op.id || opIndex} className="space-y-3 rounded-md border border-zinc-200 p-3">
            <div className="grid gap-2 md:grid-cols-7">
              <Input
                placeholder="Nome operatore"
                value={op.nome}
                onChange={(e) =>
                  setOperators((prev: any[]) => prev.map((x, i) => (i === opIndex ? { ...x, nome: e.target.value } : x)))
                }
              />
              <div className="flex h-10 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3">
                <input
                  type="color"
                  aria-label="Colore operatore"
                  className="h-6 w-8 cursor-pointer rounded border border-zinc-300"
                  value={op.color || "#2563eb"}
                  onChange={(e) =>
                    setOperators((prev: any[]) => prev.map((x, i) => (i === opIndex ? { ...x, color: e.target.value } : x)))
                  }
                />
                <span className="text-xs text-zinc-500">Colore agenda</span>
              </div>
              <Input
                type="number"
                min="1"
                max="10"
                step="1"
                placeholder="Colonne agenda (1-10)"
                value={op.agendaColumns ?? "1"}
                onChange={(e) =>
                  setOperators((prev: any[]) =>
                    prev.map((x, i) => (i === opIndex ? { ...x, agendaColumns: e.target.value } : x)),
                  )
                }
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Target fatturato"
                value={op.kpiTargetRevenue}
                onChange={(e) =>
                  setOperators((prev: any[]) =>
                    prev.map((x, i) => (i === opIndex ? { ...x, kpiTargetRevenue: e.target.value } : x)),
                  )
                }
              />
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="Target appuntamenti"
                value={op.kpiTargetAppointments}
                onChange={(e) =>
                  setOperators((prev: any[]) =>
                    prev.map((x, i) => (i === opIndex ? { ...x, kpiTargetAppointments: e.target.value } : x)),
                  )
                }
              />
              <label className="flex h-10 items-center gap-2 rounded-md border border-zinc-300 px-3 text-sm">
                <input
                  type="checkbox"
                  checked={op.attivo}
                  onChange={(e) =>
                    setOperators((prev: any[]) => prev.map((x, i) => (i === opIndex ? { ...x, attivo: e.target.checked } : x)))
                  }
                />
                Attivo
              </label>
              <Button
                variant="destructive"
                onClick={() => setOperators((prev: any[]) => prev.filter((_, i) => i !== opIndex))}
              >
                Rimuovi
              </Button>
            </div>
            <div className="space-y-2">
              {dayOrder.map((day) => (
                <div key={`${op.id || opIndex}-${day}`} className="grid gap-2 rounded border border-zinc-100 p-2 md:grid-cols-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={op.workingHours[day].enabled}
                      onChange={(e) =>
                        setOperators((prev: any[]) =>
                          prev.map((x, i) =>
                            i === opIndex
                              ? {
                                  ...x,
                                  workingHours: {
                                    ...x.workingHours,
                                    [day]: { ...x.workingHours[day], enabled: e.target.checked },
                                  },
                                }
                              : x,
                          ),
                        )
                      }
                    />
                    {dayLabel[day]}
                  </label>
                  <Input
                    type="time"
                    value={op.workingHours[day].start}
                    onChange={(e) =>
                      setOperators((prev: any[]) =>
                        prev.map((x, i) =>
                          i === opIndex
                            ? { ...x, workingHours: { ...x.workingHours, [day]: { ...x.workingHours[day], start: e.target.value } } }
                            : x,
                        ),
                      )
                    }
                    disabled={!op.workingHours[day].enabled}
                  />
                  <Input
                    type="time"
                    value={op.workingHours[day].end}
                    onChange={(e) =>
                      setOperators((prev: any[]) =>
                        prev.map((x, i) =>
                          i === opIndex
                            ? { ...x, workingHours: { ...x.workingHours, [day]: { ...x.workingHours[day], end: e.target.value } } }
                            : x,
                        ),
                      )
                    }
                    disabled={!op.workingHours[day].enabled}
                  />
                  <label className="flex h-10 items-center gap-2 rounded-md border border-zinc-300 px-3 text-sm">
                    <input
                      type="checkbox"
                      checked={op.workingHours[day].hasBreak}
                      onChange={(e) =>
                        setOperators((prev: any[]) =>
                          prev.map((x, i) =>
                            i === opIndex
                              ? {
                                  ...x,
                                  workingHours: {
                                    ...x.workingHours,
                                    [day]: {
                                      ...x.workingHours[day],
                                      hasBreak: e.target.checked,
                                      breakStart: e.target.checked ? x.workingHours[day].breakStart : "",
                                      breakEnd: e.target.checked ? x.workingHours[day].breakEnd : "",
                                    },
                                  },
                                }
                              : x,
                          ),
                        )
                      }
                      disabled={!op.workingHours[day].enabled}
                    />
                    Pausa
                  </label>
                  <Input
                    type="time"
                    value={op.workingHours[day].breakStart}
                    onChange={(e) =>
                      setOperators((prev: any[]) =>
                        prev.map((x, i) =>
                          i === opIndex
                            ? {
                                ...x,
                                workingHours: { ...x.workingHours, [day]: { ...x.workingHours[day], breakStart: e.target.value } },
                              }
                            : x,
                        ),
                      )
                    }
                    disabled={!op.workingHours[day].enabled || !op.workingHours[day].hasBreak}
                  />
                  <Input
                    type="time"
                    value={op.workingHours[day].breakEnd}
                    onChange={(e) =>
                      setOperators((prev: any[]) =>
                        prev.map((x, i) =>
                          i === opIndex
                            ? {
                                ...x,
                                workingHours: { ...x.workingHours, [day]: { ...x.workingHours[day], breakEnd: e.target.value } },
                              }
                            : x,
                        ),
                      )
                    }
                    disabled={!op.workingHours[day].enabled || !op.workingHours[day].hasBreak}
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2 rounded-md border border-zinc-100 bg-zinc-50 p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-zinc-800">Turni straordinari per data</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setOperators((prev: any[]) =>
                      prev.map((x, i) =>
                        i === opIndex
                          ? {
                              ...x,
                              exceptions: [
                                ...(x.exceptions || []),
                                {
                                  id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                                  date: "",
                                  enabled: true,
                                  start: "09:00",
                                  end: "13:00",
                                  hasBreak: false,
                                  breakStart: "",
                                  breakEnd: "",
                                },
                              ],
                            }
                          : x,
                      ),
                    )
                  }
                >
                  Aggiungi giorno extra
                </Button>
              </div>
              <p className="text-xs text-zinc-600">
                Qui puoi inserire eccezioni per una data precisa (es. un sabato del mese). Se disattivi &quot;Attivo&quot; blocchi quel giorno.
              </p>
              {(op.exceptions || []).length === 0 ? (
                <p className="text-xs text-zinc-500">Nessuna eccezione configurata.</p>
              ) : (
                (op.exceptions || []).map((ex: any) => (
                  <div key={ex.id} className="grid gap-2 rounded border border-zinc-200 bg-white p-2 md:grid-cols-7">
                    <Input
                      type="date"
                      value={ex.date}
                      onChange={(e) =>
                        setOperators((prev: any[]) =>
                          prev.map((x, i) =>
                            i === opIndex
                              ? {
                                  ...x,
                                  exceptions: (x.exceptions || []).map((row: any) =>
                                    row.id === ex.id ? { ...row, date: e.target.value } : row,
                                  ),
                                }
                              : x,
                          ),
                        )
                      }
                    />
                    <label className="flex h-10 items-center gap-2 rounded-md border border-zinc-300 px-3 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(ex.enabled)}
                        onChange={(e) =>
                          setOperators((prev: any[]) =>
                            prev.map((x, i) =>
                              i === opIndex
                                ? {
                                    ...x,
                                    exceptions: (x.exceptions || []).map((row: any) =>
                                      row.id === ex.id ? { ...row, enabled: e.target.checked } : row,
                                    ),
                                  }
                                : x,
                            ),
                          )
                        }
                      />
                      Attivo
                    </label>
                    <Input
                      type="time"
                      value={ex.start}
                      onChange={(e) =>
                        setOperators((prev: any[]) =>
                          prev.map((x, i) =>
                            i === opIndex
                              ? {
                                  ...x,
                                  exceptions: (x.exceptions || []).map((row: any) =>
                                    row.id === ex.id ? { ...row, start: e.target.value } : row,
                                  ),
                                }
                              : x,
                          ),
                        )
                      }
                      disabled={!ex.enabled}
                    />
                    <Input
                      type="time"
                      value={ex.end}
                      onChange={(e) =>
                        setOperators((prev: any[]) =>
                          prev.map((x, i) =>
                            i === opIndex
                              ? {
                                  ...x,
                                  exceptions: (x.exceptions || []).map((row: any) =>
                                    row.id === ex.id ? { ...row, end: e.target.value } : row,
                                  ),
                                }
                              : x,
                          ),
                        )
                      }
                      disabled={!ex.enabled}
                    />
                    <label className="flex h-10 items-center gap-2 rounded-md border border-zinc-300 px-3 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(ex.hasBreak)}
                        onChange={(e) =>
                          setOperators((prev: any[]) =>
                            prev.map((x, i) =>
                              i === opIndex
                                ? {
                                    ...x,
                                    exceptions: (x.exceptions || []).map((row: any) =>
                                      row.id === ex.id
                                        ? {
                                            ...row,
                                            hasBreak: e.target.checked,
                                            breakStart: e.target.checked ? row.breakStart : "",
                                            breakEnd: e.target.checked ? row.breakEnd : "",
                                          }
                                        : row,
                                    ),
                                  }
                                : x,
                            ),
                          )
                        }
                        disabled={!ex.enabled}
                      />
                      Pausa
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="time"
                        value={ex.breakStart}
                        onChange={(e) =>
                          setOperators((prev: any[]) =>
                            prev.map((x, i) =>
                              i === opIndex
                                ? {
                                    ...x,
                                    exceptions: (x.exceptions || []).map((row: any) =>
                                      row.id === ex.id ? { ...row, breakStart: e.target.value } : row,
                                    ),
                                  }
                                : x,
                            ),
                          )
                        }
                        disabled={!ex.enabled || !ex.hasBreak}
                      />
                      <Input
                        type="time"
                        value={ex.breakEnd}
                        onChange={(e) =>
                          setOperators((prev: any[]) =>
                            prev.map((x, i) =>
                              i === opIndex
                                ? {
                                    ...x,
                                    exceptions: (x.exceptions || []).map((row: any) =>
                                      row.id === ex.id ? { ...row, breakEnd: e.target.value } : row,
                                    ),
                                  }
                                : x,
                            ),
                          )
                        }
                        disabled={!ex.enabled || !ex.hasBreak}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() =>
                        setOperators((prev: any[]) =>
                          prev.map((x, i) =>
                            i === opIndex ? { ...x, exceptions: (x.exceptions || []).filter((row: any) => row.id !== ex.id) } : x,
                          ),
                        )
                      }
                    >
                      Rimuovi
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          onClick={() =>
            setOperators((prev: any[]) => [
              ...prev,
              {
                nome: `Operatore ${prev.length + 1}`,
                attivo: true,
                ordine: prev.length,
                color: "#2563eb",
                agendaColumns: "1",
                kpiTargetRevenue: "",
                kpiTargetAppointments: "",
                workingHours: normalizeWorkingHours(operators[0]?.workingHours ? toWorkingHoursJson(operators[0].workingHours) : undefined),
                exceptions: [],
              },
            ])
          }
        >
          Aggiungi operatore
        </Button>
        <Button
          onClick={() =>
            saveSection("operators", {
              operators: operators.map((o: any, i: number) => ({
                id: o.id,
                nome: o.nome,
                attivo: o.attivo,
                ordine: i,
                color: o.color,
                agendaColumns: Math.max(1, Math.min(10, Number(o.agendaColumns) || 1)),
                kpiTargetRevenue: o.kpiTargetRevenue === "" ? null : Number(o.kpiTargetRevenue),
                kpiTargetAppointments: o.kpiTargetAppointments === "" ? null : Number(o.kpiTargetAppointments),
                workingHoursJson: toWorkingHoursJson(o.workingHours, o.exceptions || []),
              })),
              overlapAllowed: Boolean(salon.overlapAllowed),
            })
          }
        >
          Salva operatori
        </Button>
      </Card>
      <Card className="space-y-2">
        <h2 className="font-semibold">WhatsApp e comunicazioni</h2>
        <p className="text-sm text-zinc-600">
          Configurazione template promemoria, API Meta e campagne massivo in pagina dedicata.
        </p>
        <Link
          href="/whatsapp"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50"
        >
          Apri pagina WhatsApp
        </Link>
      </Card>

      <Card className="space-y-2">
        <h2 className="font-semibold">Tag rapidi cane</h2>
        {tags.map((t: any, i: number) => (
          <Input key={t.id || i} value={t.nome} onChange={(e) => setTags(tags.map((x: any, idx: number) => (idx === i ? { ...x, nome: e.target.value } : x)))} />
        ))}
        <Button variant="outline" onClick={() => setTags([...tags, { nome: "Nuovo tag", ordine: tags.length }])}>
          Aggiungi tag
        </Button>
        <Button onClick={() => saveSection("tags", { tags: tags.map((t: any, i: number) => ({ nome: t.nome, ordine: i })) })}>Salva tag</Button>
      </Card>

      <Card className="space-y-2">
        <h2 className="font-semibold">Catalogo trattamenti</h2>
        {treatments.map((t: any, i: number) => (
          <div key={t.id} className="flex items-center gap-2">
            <Input value={t.nome} onChange={(e) => setTreatments(treatments.map((x: any, idx: number) => (idx === i ? { ...x, nome: e.target.value } : x)))} />
            <label className="text-sm">
              <input
                type="checkbox"
                checked={t.attivo}
                onChange={(e) => setTreatments(treatments.map((x: any, idx: number) => (idx === i ? { ...x, attivo: e.target.checked } : x)))}
              />{" "}
              Attivo
            </label>
            <Button
              variant="destructive"
              onClick={() => setTreatments(treatments.filter((_: any, idx: number) => idx !== i))}
            >
              Rimuovi
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          onClick={() => setTreatments([...treatments, { id: `new-${Date.now()}`, nome: "Nuovo trattamento", attivo: true, ordine: treatments.length }])}
        >
          Aggiungi trattamento
        </Button>
        <Button onClick={() => saveSection("treatments", { treatments: treatments.map((t: any, i: number) => ({ ...t, ordine: i })) })}>Salva trattamenti</Button>
      </Card>

      <Card className="space-y-2">
        <h2 className="font-semibold">Team e ruoli</h2>
        <div className="grid gap-2 md:grid-cols-4">
          <Input value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} placeholder="Email staff" />
          <Input value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} placeholder="Password staff" />
          <select className="h-10 rounded-md border border-zinc-300 px-3 text-sm" value={staffRole} onChange={(e) => setStaffRole(e.target.value as "MANAGER" | "STAFF")}>
            <option value="MANAGER">Manager</option>
            <option value="STAFF">Staff</option>
          </select>
          <select className="h-10 rounded-md border border-zinc-300 px-3 text-sm" value={staffSalonId} onChange={(e) => setStaffSalonId(e.target.value)}>
            {(initial.assignableSalons || []).map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.nomeSede || "Sede principale"}
              </option>
            ))}
            {(initial.assignableSalons || []).length > 1 ? (
              <option value="__ALL__">Entrambe le sedi (gruppo)</option>
            ) : null}
          </select>
        </div>
        <Button onClick={createTeamUser} disabled={initial.role !== "OWNER"}>
          Crea utente team
        </Button>
        {(initial.assignableSalons || []).length > 1 ? (
          <p className="text-xs text-zinc-500">
            Se scegli &quot;Entrambe le sedi&quot;, l&apos;utente potra cambiare sede dal selettore in alto.
          </p>
        ) : null}
        {initial.role !== "OWNER" ? (
          <p className="text-xs text-zinc-500">Solo l&apos;owner può creare/modificare/eliminare membri team.</p>
        ) : null}
        <div className="space-y-2">
          {staff.map((s: any) => (
            <div key={s.id} className="grid gap-2 rounded-md border border-zinc-200 p-3 md:grid-cols-7">
              {(() => {
                const isOwnerSelf = s.ruolo === "OWNER" && s.id === initial.currentUserId;
                const ownerProtected = s.ruolo === "OWNER" && !isOwnerSelf;
                return (
                  <>
              <Input
                value={s.email}
                onChange={(e) => setStaff((prev: any[]) => prev.map((x) => (x.id === s.id ? { ...x, email: e.target.value } : x)))}
                placeholder="Email"
                disabled={ownerProtected || isOwnerSelf || initial.role !== "OWNER"}
              />
              <select
                className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
                value={s.ruolo}
                onChange={(e) => setStaff((prev: any[]) => prev.map((x) => (x.id === s.id ? { ...x, ruolo: e.target.value } : x)))}
                disabled={ownerProtected || isOwnerSelf || initial.role !== "OWNER"}
              >
                <option value="MANAGER">Manager</option>
                <option value="STAFF">Staff</option>
                {s.ruolo === "OWNER" ? <option value="OWNER">Owner</option> : null}
              </select>
              <select
                className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
                value={s.canAccessGroupSalons ? "__ALL__" : (s.salon?.id || "")}
                onChange={(e) =>
                  setStaff((prev: any[]) =>
                    prev.map((x) =>
                      x.id === s.id
                        ? e.target.value === "__ALL__"
                          ? { ...x, canAccessGroupSalons: true }
                          : {
                              ...x,
                              canAccessGroupSalons: false,
                              salon: {
                                id: e.target.value,
                                nomeSede:
                                  (initial.assignableSalons || []).find((row: any) => row.id === e.target.value)?.nomeSede ||
                                  "Sede principale",
                              },
                            }
                        : x,
                    ),
                  )
                }
                disabled={ownerProtected || isOwnerSelf || initial.role !== "OWNER"}
              >
                {(initial.assignableSalons || []).map((row: any) => (
                  <option key={row.id} value={row.id}>
                    {row.nomeSede || "Sede principale"}
                  </option>
                ))}
                {(initial.assignableSalons || []).length > 1 ? (
                  <option value="__ALL__">Entrambe le sedi (gruppo)</option>
                ) : null}
              </select>
              {isOwnerSelf ? (
                <div className="space-y-2 md:col-span-2">
                  <p className="text-xs text-zinc-600">
                    Cambio password owner: min 10 caratteri con maiuscola, minuscola, numero e simbolo.
                  </p>
                  <div className="grid gap-2 md:grid-cols-3">
                    <div className="relative">
                      <Input
                        type={s.showCurrentPassword ? "text" : "password"}
                        value={s.currentPassword || ""}
                        onChange={(e) => setStaff((prev: any[]) => prev.map((x) => (x.id === s.id ? { ...x, currentPassword: e.target.value } : x)))}
                        placeholder="Vecchia password"
                        disabled={initial.role !== "OWNER"}
                        className="pr-20"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="absolute right-1 top-1 h-8 px-2 text-xs"
                        onClick={() => setStaff((prev: any[]) => prev.map((x) => (x.id === s.id ? { ...x, showCurrentPassword: !x.showCurrentPassword } : x)))}
                      >
                        {s.showCurrentPassword ? "Nascondi" : "Mostra"}
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        type={s.showNewPassword ? "text" : "password"}
                        value={s.newPassword || ""}
                        onChange={(e) => setStaff((prev: any[]) => prev.map((x) => (x.id === s.id ? { ...x, newPassword: e.target.value } : x)))}
                        placeholder="Nuova password"
                        disabled={initial.role !== "OWNER"}
                        className="pr-20"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="absolute right-1 top-1 h-8 px-2 text-xs"
                        onClick={() => setStaff((prev: any[]) => prev.map((x) => (x.id === s.id ? { ...x, showNewPassword: !x.showNewPassword } : x)))}
                      >
                        {s.showNewPassword ? "Nascondi" : "Mostra"}
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        type={s.showConfirmPassword ? "text" : "password"}
                        value={s.confirmNewPassword || ""}
                        onChange={(e) => setStaff((prev: any[]) => prev.map((x) => (x.id === s.id ? { ...x, confirmNewPassword: e.target.value } : x)))}
                        placeholder="Conferma nuova"
                        disabled={initial.role !== "OWNER"}
                        className="pr-20"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="absolute right-1 top-1 h-8 px-2 text-xs"
                        onClick={() => setStaff((prev: any[]) => prev.map((x) => (x.id === s.id ? { ...x, showConfirmPassword: !x.showConfirmPassword } : x)))}
                      >
                        {s.showConfirmPassword ? "Nascondi" : "Mostra"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Input
                  type="password"
                  value={s.password || ""}
                  onChange={(e) => setStaff((prev: any[]) => prev.map((x) => (x.id === s.id ? { ...x, password: e.target.value } : x)))}
                  placeholder="Nuova password (opzionale)"
                  disabled={initial.role !== "OWNER"}
                />
              )}
              <Button
                variant="outline"
                onClick={() => saveTeamUser(s)}
                disabled={initial.role !== "OWNER" || (ownerProtected && s.ruolo === "OWNER")}
              >
                Salva
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteTeamUser(s)}
                disabled={s.ruolo === "OWNER" || initial.role !== "OWNER"}
              >
                Elimina
              </Button>
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      </Card>

      {initial.role === "OWNER" ? (
        <Card className="space-y-3 border-red-200 bg-red-50/40">
          <h2 className="font-semibold text-red-800">Richiedi eliminazione account</h2>
          <p className="text-sm text-red-800">
            Prima di procedere proteggi la tua lista clienti scaricandola dalla sezione dedicata:
            <strong> Esporta clienti CSV</strong>.
          </p>
          <p className="text-sm text-red-700">
            L&apos;eliminazione account è irreversibile. Il team ti darà conferma a breve prima della chiusura definitiva.
          </p>
          <div className="max-w-sm space-y-2">
            <p className="text-xs font-medium text-red-800">Digita ELIMINA per confermare la richiesta</p>
            <Input
              value={deleteConfirmWord}
              onChange={(e) => setDeleteConfirmWord(e.target.value)}
              placeholder="ELIMINA"
            />
          </div>
          <Button variant="destructive" onClick={requestAccountDeletion} disabled={deleteRequestLoading}>
            {deleteRequestLoading ? "Invio richiesta..." : "Richiedi eliminazione account"}
          </Button>
        </Card>
      ) : null}
    </div>
  );
}


