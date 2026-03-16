import { NextResponse } from "next/server";

export async function GET() {
  const csv = [
    "nome,cognome,telefono,email,noteCliente,consensoPromemoria",
    "Mario,Rossi,+393401112233,mario@example.com,Cliente storico,true",
    "Giulia,Bianchi,+393477778888,giulia@example.com,Preferisce mattina,false",
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=template-clienti-import.csv",
    },
  });
}
