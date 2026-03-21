import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";

type ImportRow = {
  nome: string;
  cognome: string;
  telefono: string;
  email?: string;
  noteCliente?: string;
  consensoPromemoria?: string;
  sourceRow: number;
};

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return { headers: [] as string[], rows: [] as string[][] };

  const delimiter = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ";" : ",";

  const parseLine = (line: string) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === "\"") {
        if (inQuotes && line[i + 1] === "\"") {
          current += "\"";
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase());
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function normalizeVcf(text: string) {
  return text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

function splitName(fullName: string) {
  const cleaned = fullName.trim();
  if (!cleaned) return { nome: "", cognome: "" };
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return { nome: parts[0], cognome: "-" };
  return { nome: parts.slice(0, -1).join(" "), cognome: parts.slice(-1)[0] };
}

function parseVcf(text: string): ImportRow[] {
  const normalized = normalizeVcf(text);
  const cards = normalized
    .split(/END:VCARD/i)
    .map((c) => c.trim())
    .filter((c) => c.includes("BEGIN:VCARD"));

  const rows: ImportRow[] = [];

  cards.forEach((card, index) => {
    const lines = card.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let fn = "";
    let nField = "";
    let tel = "";
    let email = "";
    let note = "";

    for (const line of lines) {
      const [rawKey, ...rawValueParts] = line.split(":");
      if (!rawValueParts.length) continue;
      const value = rawValueParts.join(":").trim();
      const key = rawKey.toUpperCase();

      if (!fn && key.startsWith("FN")) fn = value;
      if (!nField && key.startsWith("N")) nField = value;
      if (!tel && key.startsWith("TEL")) tel = value;
      if (!email && key.startsWith("EMAIL")) email = value;
      if (!note && key.startsWith("NOTE")) note = value.replace(/\\n/gi, "\n");
    }

    let nome = "";
    let cognome = "";
    if (nField) {
      const [last = "", first = ""] = nField.split(";");
      nome = first.trim();
      cognome = last.trim() || "-";
    } else {
      const split = splitName(fn);
      nome = split.nome;
      cognome = split.cognome;
    }

    rows.push({
      nome: nome.trim(),
      cognome: cognome.trim(),
      telefono: tel.trim(),
      email: email.trim() || undefined,
      noteCliente: note.trim() || undefined,
      sourceRow: index + 1,
    });
  });

  return rows;
}

function truthy(v: string | undefined) {
  if (!v) return false;
  const value = v.trim().toLowerCase();
  return ["1", "true", "si", "sì", "yes", "y"].includes(value);
}

function toImportRowsFromCsv(text: string): { rows: ImportRow[]; error?: string } {
  const { headers, rows } = parseCsv(text);
  if (!headers.length) return { rows: [], error: "CSV vuoto" };

  const idxNome = headers.indexOf("nome");
  const idxCognome = headers.indexOf("cognome");
  const idxTelefono = headers.indexOf("telefono");
  const idxEmail = headers.indexOf("email");
  const idxNote = headers.indexOf("notecliente");
  const idxConsenso = headers.indexOf("consensopromemoria");

  if (idxNome < 0 || idxCognome < 0 || idxTelefono < 0) {
    return { rows: [], error: "Intestazioni obbligatorie: nome,cognome,telefono" };
  }

  return {
    rows: rows.map((r, i) => ({
      nome: r[idxNome]?.trim() ?? "",
      cognome: r[idxCognome]?.trim() ?? "",
      telefono: r[idxTelefono]?.trim() ?? "",
      email: idxEmail >= 0 ? (r[idxEmail]?.trim() || undefined) : undefined,
      noteCliente: idxNote >= 0 ? (r[idxNote]?.trim() || undefined) : undefined,
      consensoPromemoria: idxConsenso >= 0 ? (r[idxConsenso]?.trim() || undefined) : undefined,
      sourceRow: i + 2,
    })),
  };
}

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File mancante (CSV o VCF)" }, { status: 400 });
  }

  const text = await file.text();
  const filename = file.name.toLowerCase();
  const isVcf = filename.endsWith(".vcf") || file.type.includes("vcard");

  let importRows: ImportRow[] = [];
  if (isVcf) {
    importRows = parseVcf(text);
    if (!importRows.length) {
      return NextResponse.json({ error: "VCF vuoto o non valido" }, { status: 400 });
    }
  } else {
    const csvParsed = toImportRowsFromCsv(text);
    if (csvParsed.error) {
      return NextResponse.json({ error: csvParsed.error }, { status: 400 });
    }
    importRows = csvParsed.rows;
  }

  const salon = await prisma.salon.findUnique({ where: { id: salonId }, select: { subscriptionPlan: true } });
  const existingCount = await prisma.client.count({ where: { salonId, deletedAt: null } });
  const limit = salon?.subscriptionPlan === "FREE" ? 50 : Number.MAX_SAFE_INTEGER;
  let remaining = Math.max(0, limit - existingCount);

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < importRows.length; i += 1) {
    if (remaining <= 0) {
      skipped += importRows.length - i;
      errors.push(`Limite piano raggiunto: import interrotto alla riga ${importRows[i].sourceRow}`);
      break;
    }

    const row = importRows[i];
    if (!row.nome || !row.cognome || !row.telefono) {
      skipped += 1;
      errors.push(`Riga ${row.sourceRow}: dati mancanti (nome/cognome/telefono)`);
      continue;
    }

    try {
      const consenso = truthy(row.consensoPromemoria);
      await prisma.client.create({
        data: {
          salonId,
          nome: row.nome,
          cognome: row.cognome,
          telefono: row.telefono,
          email: row.email || null,
          noteCliente: row.noteCliente || null,
          consensoPromemoria: consenso,
          consensoTimestamp: consenso ? new Date() : null,
        },
      });
      created += 1;
      remaining -= 1;
    } catch {
      skipped += 1;
      errors.push(`Riga ${row.sourceRow}: errore inserimento`);
    }
  }

  return NextResponse.json({ created, skipped, errors: errors.slice(0, 20) });
}
