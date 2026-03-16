"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { aggregateByCurrency, formatCurrencyTotals } from "@/lib/money";

export function PaymentsClient({ initial, exportHref }: { initial: any[]; exportHref: string }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState(initial);

  useEffect(() => {
    setRows(initial);
  }, [initial]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const d = new Date(r.dateTime);
      const fromOk = from ? d >= new Date(from) : true;
      const toOk = to ? d <= new Date(to + "T23:59:59") : true;
      return fromOk && toOk;
    });
  }, [rows, from, to]);

  const totalIn = aggregateByCurrency(filtered, (r) => r.salon?.valuta || "EUR", (r) => Number(r.grossAmount));
  const totalTips = aggregateByCurrency(filtered, (r) => r.salon?.valuta || "EUR", (r) => Number(r.tipAmount));

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-sm">Da</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-sm">A</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <a href={exportHref}><Button variant="outline">Export CSV movimenti</Button></a>
      </Card>

      <Card>
        <p className="text-sm text-zinc-500">Totale entrate</p>
        <p className="text-2xl font-semibold">{formatCurrencyTotals(totalIn)}</p>
        <p className="text-sm text-zinc-500">Totale mance</p>
        <p className="text-lg">{formatCurrencyTotals(totalTips)}</p>
        <p className="text-sm text-zinc-500">Totale uscite</p>
        <p className="text-lg">0.00 (struttura pronta MVP)</p>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Lista movimenti</h2>
        <div className="space-y-2 text-sm">
          {filtered.map((r) => (
            <div key={r.id} className="rounded border border-zinc-200 p-3">
              <p className="font-medium">{format(new Date(r.dateTime), "dd/MM/yyyy HH:mm")} - {r.method} - {r.salon?.valuta || "EUR"} {Number(r.grossAmount).toFixed(2)}</p>
              <p className="text-zinc-600">Servizio: {r.salon?.valuta || "EUR"} {Number(r.amount).toFixed(2)} - Mancia: {r.salon?.valuta || "EUR"} {Number(r.tipAmount).toFixed(2)}</p>
              <p className="text-zinc-600">
                Sede: {r.salon?.nomeSede || "Sede principale"}
              </p>
              <p>{r.appointment.cane.nome} - {r.appointment.cliente.nome} {r.appointment.cliente.cognome}</p>
              <p>{r.note || ""}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

