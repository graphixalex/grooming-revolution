import { Resend } from "resend";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function getFromAddress() {
  return process.env.EMAIL_FROM || "Grooming Revolution <onboarding@resend.dev>";
}

async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
}) {
  const client = getResendClient();
  if (!client) return { ok: false as const, reason: "email_not_configured" };

  try {
    await client.emails.send({
      from: getFromAddress(),
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return { ok: true as const };
  } catch (error) {
    console.error("email_send_failed", error);
    return { ok: false as const, reason: "email_send_failed" };
  }
}

export async function sendRegistrationWelcomeEmail(input: {
  to: string;
  businessName: string;
  branchName: string;
}) {
  const subject = "Registrazione completata - Grooming Revolution";
  const text =
    `Ciao,\n\n` +
    `il tuo account e stato creato con successo.\n` +
    `Attivita: ${input.businessName}\n` +
    `Sede: ${input.branchName}\n\n` +
    `Puoi accedere quando vuoi da /login con la tua email.\n\n` +
    `Se non hai effettuato tu questa registrazione, contattaci subito.\n`;

  return sendEmail({ to: input.to, subject, text });
}

export async function sendPasswordChangedEmail(input: {
  to: string;
  changedByEmail?: string | null;
}) {
  const subject = "Password aggiornata - Grooming Revolution";
  const by = input.changedByEmail ? ` da ${input.changedByEmail}` : "";
  const text =
    `Ciao,\n\n` +
    `ti confermiamo che la password del tuo account e stata aggiornata${by}.\n` +
    `Se non riconosci questa modifica, cambia subito la password e contatta il supporto.\n`;

  return sendEmail({ to: input.to, subject, text });
}

