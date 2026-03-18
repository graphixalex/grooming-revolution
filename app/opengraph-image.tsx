import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0f172a 0%, #1f355f 52%, #d4af37 100%)",
          color: "white",
          padding: 56,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              background: "#d4af37",
            }}
          />
          Grooming Revolution
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 920 }}>
          <div style={{ fontSize: 64, lineHeight: 1.04, fontWeight: 800 }}>
            Gestionale professionale per toelettatura
          </div>
          <div style={{ fontSize: 30, color: "#e5e7eb", lineHeight: 1.3 }}>
            Agenda, clienti, incassi, listino intelligente e report.
          </div>
        </div>

        <div style={{ fontSize: 24, color: "#fde68a" }}>grooming-revolution.vercel.app</div>
      </div>
    ),
    size,
  );
}
