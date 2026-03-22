import { Resend } from "resend";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function getFromAddress() {
  return process.env.EMAIL_FROM || "Grooming Revolution <onboarding@resend.dev>";
}

function getAppUrl() {
  return (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
}

function getSupportEmail() {
  return process.env.SUPPORT_EMAIL || "support@grooming-revolution.com";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderShell(input: { title: string; subtitle: string; bodyHtml: string }) {
  const appUrl = getAppUrl();
  const year = new Date().getFullYear();
  const supportEmail = getSupportEmail();

  return `
<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;background:#f4f5f7;font-family:Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:700px;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#f59e0b,#fb7185);padding:24px 24px 16px 24px;">
                <img src="${appUrl}/img/logo-grooming-revolution.png" alt="Grooming Revolution" style="max-width:260px;width:100%;height:auto;display:block;" />
                <h1 style="margin:16px 0 6px 0;color:#111827;font-size:24px;line-height:1.2;">${escapeHtml(input.title)}</h1>
                <p style="margin:0;color:#111827;opacity:0.9;font-size:14px;">${escapeHtml(input.subtitle)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                ${input.bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e5e7eb;padding:16px 24px;background:#fafafa;color:#6b7280;font-size:12px;">
                <p style="margin:0 0 6px 0;">Grooming Revolution - SaaS gestionale per toelettatura</p>
                <p style="margin:0 0 6px 0;">Supporto: <a href="mailto:${escapeHtml(supportEmail)}" style="color:#374151;">${escapeHtml(supportEmail)}</a></p>
                <p style="margin:0;">© ${year} Grooming Revolution. Tutti i diritti riservati.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();
}

async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const client = getResendClient();
  if (!client) return { ok: false as const, reason: "email_not_configured" };

  try {
    await client.emails.send({
      from: getFromAddress(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
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
  const appUrl = getAppUrl();
  const supportEmail = getSupportEmail();
  const subject = "Benvenuto in Grooming Revolution - setup operativo completo";

  const html = renderShell({
    title: "Registrazione completata",
    subtitle: "Benvenuto su Grooming Revolution",
    bodyHtml: `
      <p style="margin:0 0 12px 0;font-size:14px;">
        Ciao, grazie per aver scelto Grooming Revolution.
        Il tuo account e pronto.
      </p>
      <p style="margin:0 0 16px 0;font-size:14px;">
        <strong>Attivita:</strong> ${escapeHtml(input.businessName)}<br/>
        <strong>Sede:</strong> ${escapeHtml(input.branchName || "Sede principale")}
      </p>

      <div style="border:1px solid #f59e0b;background:#fffbeb;border-radius:10px;padding:12px 14px;margin:0 0 18px 0;">
        <p style="margin:0;font-size:13px;line-height:1.5;">
          Prima di iniziare con gli appuntamenti, completa questi passaggi in ordine.
          Ti evitano errori in agenda, tempi sbagliati e report non allineati.
        </p>
      </div>

      <h2 style="margin:0 0 8px 0;font-size:16px;">Checklist operativa (da fare subito)</h2>
      <ol style="margin:0 0 16px 18px;padding:0;font-size:14px;line-height:1.6;">
        <li><strong>Listino prezzi:</strong> vai su <strong>Listino</strong> e configura prezzo + durata media per servizio/taglia/razza (se vuoi). Questo guida stime e slot.</li>
        <li><strong>Orari sede:</strong> in <strong>Impostazioni</strong> imposta giorni di apertura, orari e pause.</li>
        <li><strong>Team:</strong> in <strong>Team e ruoli</strong> crea manager/staff e assegna sede/permessi.</li>
        <li><strong>Operatori:</strong> configura operatori, disponibilita e KPI per monitorare produzione.</li>
        <li><strong>Sedi multiple:</strong> se hai piu sedi, crea/gestisci sedi da <strong>Sedi</strong> e verifica timezone/valuta per ognuna.</li>
        <li><strong>Template messaggi:</strong> aggiorna testo WhatsApp/email in <strong>Impostazioni</strong>.</li>
      </ol>

      <h2 style="margin:0 0 8px 0;font-size:16px;">WhatsApp automatico e reminder</h2>
      <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;">
        Se colleghi WhatsApp API (Meta) in <strong>Impostazioni</strong>, il sistema puo inviare reminder automatici giornalieri degli appuntamenti prenotati.
      </p>
      <ul style="margin:0 0 16px 18px;padding:0;font-size:14px;line-height:1.6;">
        <li>Inserisci <strong>Phone Number ID</strong></li>
        <li>Inserisci <strong>Access Token</strong></li>
        <li>Conferma versione API (default suggerita)</li>
        <li>Attiva l&apos;invio API</li>
      </ul>

      <h2 style="margin:0 0 8px 0;font-size:16px;">Import clienti</h2>
      <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;">
        Se hai gia una lista clienti storica, scrivici a
        <a href="mailto:${escapeHtml(supportEmail)}" style="color:#b45309;">${escapeHtml(supportEmail)}</a>.
        Il team puo assisterti nel caricamento iniziale per partire in modo pulito.
      </p>

      <h2 style="margin:0 0 8px 0;font-size:16px;">Come funziona la logica appuntamenti</h2>
      <ul style="margin:0 0 16px 18px;padding:0;font-size:14px;line-height:1.6;">
        <li>Durata appuntamento stimata dal listino (servizio/taglia, eventuali regole extra).</li>
        <li>Controllo sovrapposizioni in base alle regole sede/operatori.</li>
        <li>Check-out con POS/CASH, mance e report automatici.</li>
        <li>Dashboard e report multi-sede in tempo reale.</li>
      </ul>

      <h2 style="margin:0 0 8px 0;font-size:16px;">Desktop + smartphone</h2>
      <p style="margin:0 0 18px 0;font-size:14px;line-height:1.6;">
        Grooming Revolution e ottimizzato per uso quotidiano anche da smartphone:
        agenda, clienti, incassi e messaggi sono gestibili in mobilita.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px 0;">
        <tr>
          <td style="border-radius:10px;background:#111827;">
            <a href="${appUrl}/login" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
              Accedi e completa il setup
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:12px;color:#6b7280;">
        Se non hai effettuato tu questa registrazione, ignora questa email e contattaci subito.
      </p>
    `,
  });

  const text =
    `Ciao,\n\n` +
    `benvenuto in Grooming Revolution. Il tuo account e pronto.\n` +
    `Attivita: ${input.businessName}\n` +
    `Sede: ${input.branchName || "Sede principale"}\n\n` +
    `Setup consigliato prima di partire:\n` +
    `1) Configura il listino con prezzi e durata media per servizio/taglia.\n` +
    `2) Imposta giorni/orari di apertura e pause della sede.\n` +
    `3) Crea team (manager/staff) e operatori con disponibilita.\n` +
    `4) Se hai piu sedi, configura ciascuna sede (timezone/valuta).\n` +
    `5) Configura template messaggi e WhatsApp API per reminder automatici.\n` +
    `6) Se hai lista clienti, contattaci per supporto import.\n\n` +
    `Accesso: ${appUrl}/login\n` +
    `Supporto: ${supportEmail}\n`;

  return sendEmail({ to: input.to, subject, text, html });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  rawToken: string;
  expiresInMinutes: number;
}) {
  const appUrl = getAppUrl();
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(input.rawToken)}`;
  const subject = "Reimposta la password - Grooming Revolution";

  const html = renderShell({
    title: "Recupero password",
    subtitle: "Richiesta di reset password",
    bodyHtml: `
      <p style="margin:0 0 12px 0;font-size:14px;">
        Abbiamo ricevuto una richiesta di reimpostazione password per il tuo account.
      </p>
      <p style="margin:0 0 14px 0;font-size:14px;">
        Il link seguente e valido per <strong>${input.expiresInMinutes} minuti</strong> e puo essere usato una sola volta.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 14px 0;">
        <tr>
          <td style="border-radius:10px;background:#111827;">
            <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
              Reimposta password
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 8px 0;font-size:12px;color:#6b7280;">
        Se il pulsante non funziona, copia e incolla questo link:
      </p>
      <p style="margin:0 0 14px 0;font-size:12px;word-break:break-all;color:#374151;">${escapeHtml(resetUrl)}</p>
      <p style="margin:0;font-size:12px;color:#6b7280;">
        Se non hai richiesto tu il reset, ignora questa email.
      </p>
    `,
  });

  const text =
    `Richiesta reset password.\n` +
    `Usa questo link entro ${input.expiresInMinutes} minuti:\n${resetUrl}\n\n` +
    `Se non hai richiesto il reset, ignora questa email.\n`;

  return sendEmail({ to: input.to, subject, text, html });
}

export async function sendPasswordChangedEmail(input: {
  to: string;
  changedByEmail?: string | null;
}) {
  const subject = "Password aggiornata - Grooming Revolution";
  const by = input.changedByEmail ? ` da ${input.changedByEmail}` : "";

  const html = renderShell({
    title: "Password aggiornata",
    subtitle: "Conferma modifica credenziali",
    bodyHtml: `
      <p style="margin:0 0 12px 0;font-size:14px;">
        Ti confermiamo che la password del tuo account e stata aggiornata${escapeHtml(by)}.
      </p>
      <p style="margin:0;font-size:13px;color:#6b7280;">
        Se non riconosci questa modifica, reimposta subito la password e contatta il supporto.
      </p>
    `,
  });

  const text =
    `La password del tuo account e stata aggiornata${by}.\n` +
    `Se non riconosci questa modifica, reimposta subito la password e contatta il supporto.\n`;

  return sendEmail({ to: input.to, subject, text, html });
}

