import { NextResponse } from "next/server";

// Apply at the response boundary: secrets remain available to server-side callers.
// The replacer also protects nested Salon records and arrays, preserving JSON date handling.
export function salonJson(body: unknown, init?: ResponseInit) {
  const safeBody = JSON.parse(JSON.stringify(body, (key, value) => key === "whatsappApiAccessToken" ? undefined : value));
  return NextResponse.json(safeBody, init);
}
