export async function POST() {
  return Response.json(
    {
      error: "embedded_signup_deprecated",
      message: "Il collegamento WhatsApp tramite Meta Embedded Signup è dismesso. Usa la disconnessione dalla nuova sezione connessione WhatsApp.",
    },
    { status: 410 },
  );
}
