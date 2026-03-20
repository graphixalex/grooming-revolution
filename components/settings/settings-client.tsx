"use client";

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

function toWorkingHoursJson(state: WorkingHoursState) {
  const out: Record<string, { enabled: boolean; start: string; end: string; breaks: Array<{ start: string; end: string }> }> = {};
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
  const [workingHours, setWorkingHours] = useState<WorkingHoursState>(normalizeWorkingHours(initial.salon?.workingHoursJson));
  const [operators, setOperators] = useState(
    (initial.operators || []).map((o: any, idx: number) => ({
      id: o.id,
      nome: o.nome || "",
      attivo: Boolean(o.attivo),
      ordine: o.ordine ?? idx,
      color: o.color || "#2563eb",
      kpiTargetRevenue: o.kpiTargetRevenue != null ? String(o.kpiTargetRevenue) : "",
      kpiTargetAppointments: o.kpiTargetAppointments != null ? String(o.kpiTargetAppointments) : "",
      workingHours: normalizeWorkingHours(o.workingHoursJson),
    })),
  );

  async function saveSection(section: string, payload: Record<string, unknown>) {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore salvataggio");
      return;
    }
    alert("Salvato");
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <h2 className="font-semibold">Dati attivita</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <Input value={salon.nomeAttivita || ""} onChange={(e) => setSalon({ ...salon, nomeAttivita: e.target.value })} placeholder="Nome attivita" />
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
        </div>
        <Button onClick={() => saveSection("salon", salon)}>Salva dati attivita</Button>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Orari di lavoro</h2>
        <p className="text-sm text-zinc-600">Configura gli orari per ogni giorno. La pausa e opzionale.</p>
        <div className="space-y-2">
          {dayOrder.map((day) => (
            <div key={day} className="grid gap-2 rounded-md border border-zinc-200 p-3 md:grid-cols-7">
              <label className="flex items-center gap-2 text-sm md:col-span-1">
                <input
                  type="checkbox"
                  checked={workingHours[day].enabled}
                  onChange={(e) => setWorkingHours((prev) => ({ ...prev, [day]: { ...prev[day], enabled: e.target.checked } }))}
                />
                {dayLabel[day]}
              </label>
              <div className="md:col-span-1">
                <p className="text-xs text-zinc-500">Inizio</p>
                <Input
                  type="time"
                  value={workingHours[day].start}
                  onChange={(e) => setWorkingHours((prev) => ({ ...prev, [day]: { ...prev[day], start: e.target.value } }))}
                  disabled={!workingHours[day].enabled}
                />
              </div>
              <div className="md:col-span-1">
                <p className="text-xs text-zinc-500">Fine</p>
                <Input
                  type="time"
                  value={workingHours[day].end}
                  onChange={(e) => setWorkingHours((prev) => ({ ...prev, [day]: { ...prev[day], end: e.target.value } }))}
                  disabled={!workingHours[day].enabled}
                />
              </div>
              <div className="md:col-span-1">
                <p className="text-xs text-zinc-500">Pausa</p>
                <label className="flex h-10 items-center gap-2 rounded-md border border-zinc-300 px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={workingHours[day].hasBreak}
                    onChange={(e) =>
                      setWorkingHours((prev) => ({
                        ...prev,
                        [day]: {
                          ...prev[day],
                          hasBreak: e.target.checked,
                          breakStart: e.target.checked ? prev[day].breakStart : "",
                          breakEnd: e.target.checked ? prev[day].breakEnd : "",
                        },
                      }))
                    }
                    disabled={!workingHours[day].enabled}
                  />
                  Pausa attiva
                </label>
              </div>
              <div className="md:col-span-1">
                <p className="text-xs text-zinc-500">Pausa da</p>
                <Input
                  type="time"
                  value={workingHours[day].breakStart}
                  onChange={(e) => setWorkingHours((prev) => ({ ...prev, [day]: { ...prev[day], breakStart: e.target.value } }))}
                  disabled={!workingHours[day].enabled || !workingHours[day].hasBreak}
                />
              </div>
              <div className="md:col-span-1">
                <p className="text-xs text-zinc-500">Pausa a</p>
                <Input
                  type="time"
                  value={workingHours[day].breakEnd}
                  onChange={(e) => setWorkingHours((prev) => ({ ...prev, [day]: { ...prev[day], breakEnd: e.target.value } }))}
                  disabled={!workingHours[day].enabled || !workingHours[day].hasBreak}
                />
              </div>
            </div>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(salon.overlapAllowed)} onChange={(e) => setSalon({ ...salon, overlapAllowed: e.target.checked })} />
          Consenti sovrapposizioni appuntamenti
        </label>
        <Button
          onClick={() =>
            saveSection("workingHours", {
              workingHoursJson: toWorkingHoursJson(workingHours),
              overlapAllowed: salon.overlapAllowed,
            })
          }
        >
          Salva orari
        </Button>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Operatori e KPI</h2>
        <p className="text-sm text-zinc-600">
          Crea gli operatori della sede, definisci i loro orari e imposta target KPI mensili.
        </p>
        {operators.map((op: any, opIndex: number) => (
          <div key={op.id || opIndex} className="space-y-3 rounded-md border border-zinc-200 p-3">
            <div className="grid gap-2 md:grid-cols-6">
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
                kpiTargetRevenue: "",
                kpiTargetAppointments: "",
                workingHours: normalizeWorkingHours(salon?.workingHoursJson),
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
                kpiTargetRevenue: o.kpiTargetRevenue === "" ? null : Number(o.kpiTargetRevenue),
                kpiTargetAppointments: o.kpiTargetAppointments === "" ? null : Number(o.kpiTargetAppointments),
                workingHoursJson: toWorkingHoursJson(o.workingHours),
              })),
            })
          }
        >
          Salva operatori
        </Button>
      </Card>

      <Card className="space-y-2">
        <h2 className="font-semibold">Modelli messaggi WhatsApp / Email</h2>
        <p className="text-xs text-zinc-500">Placeholder: %nome_cliente% %nome_pet% %data_appuntamento% %orario_appuntamento% %nome_attivita% %indirizzo_attivita%</p>
        <Textarea value={salon.whatsappTemplate || ""} onChange={(e) => setSalon({ ...salon, whatsappTemplate: e.target.value })} />
        <Textarea value={salon.emailTemplate || ""} onChange={(e) => setSalon({ ...salon, emailTemplate: e.target.value })} />
        <div className="rounded-md border border-zinc-200 p-3 space-y-2">
          <h3 className="text-sm font-semibold">WhatsApp API (opzionale)</h3>
          <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 space-y-2">
            <p className="font-semibold">Guida rapida collegamento (elementare)</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>Apri Meta for Developers e crea/configura una app con WhatsApp Business Platform.</li>
              <li>Recupera il Phone Number ID del numero WhatsApp Business da collegare.</li>
              <li>Genera un Access Token con permessi per invio messaggi.</li>
              <li>Incolla Phone Number ID e Access Token qui sotto, lascia versione API su v23.0.</li>
              <li>Attiva la checkbox e clicca Salva messaggio.</li>
            </ol>
            <p>
              Se manca qualcosa o il token non e valido, il sistema torna automaticamente al metodo manuale
              (apertura WhatsApp con link), quindi non si blocca nulla.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(salon.whatsappApiEnabled)}
              onChange={(e) => setSalon({ ...salon, whatsappApiEnabled: e.target.checked })}
            />
            Abilita invio automatico via API Meta
          </label>
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              value={salon.whatsappApiPhoneNumberId || ""}
              onChange={(e) => setSalon({ ...salon, whatsappApiPhoneNumberId: e.target.value })}
              placeholder="Phone Number ID"
            />
            <Input
              value={salon.whatsappApiVersion || "v23.0"}
              onChange={(e) => setSalon({ ...salon, whatsappApiVersion: e.target.value })}
              placeholder="Versione API (es. v23.0)"
            />
          </div>
          <Input
            type="password"
            value={salon.whatsappApiAccessToken || ""}
            onChange={(e) => setSalon({ ...salon, whatsappApiAccessToken: e.target.value })}
            placeholder="Access Token (lascia vuoto per mantenere quello attuale)"
          />
          <p className="text-xs text-zinc-500">
            Se la configurazione API non e attiva o non valida, il sistema usa automaticamente il metodo manuale (wa.me).
          </p>
        </div>
        <Button
          onClick={() =>
            saveSection("templates", {
              whatsappTemplate: salon.whatsappTemplate,
              emailTemplate: salon.emailTemplate,
              whatsappApiEnabled: Boolean(salon.whatsappApiEnabled),
              whatsappApiPhoneNumberId: salon.whatsappApiPhoneNumberId || "",
              whatsappApiVersion: salon.whatsappApiVersion || "v23.0",
              whatsappApiAccessToken: salon.whatsappApiAccessToken || "",
            })
          }
        >
          Salva messaggio
        </Button>
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
          </select>
        </div>
        <Button onClick={() => saveSection("staff", { email: staffEmail, password: staffPassword, role: staffRole, salonId: staffSalonId })}>Crea utente team</Button>
        <div className="text-sm text-zinc-600">
          {initial.staff.map((s: any) => (
            <p key={s.id}>
              {s.email} - {s.ruolo} - {s.salon?.nomeSede || "Sede principale"}
            </p>
          ))}
        </div>
      </Card>
    </div>
  );
}
