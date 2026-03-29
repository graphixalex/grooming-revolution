export async function POST() {
  return Response.json(
    {
      error: "embedded_signup_deprecated",
      message: "Il collegamento WhatsApp tramite Meta Embedded Signup è dismesso. Usa il collegamento linked session nella pagina WhatsApp.",
    },
    { status: 410 },
  );
}
