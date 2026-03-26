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
  const official = "servizioclienti@grooming-revolution.com";
  const configured = (process.env.SUPPORT_EMAIL || "").trim().toLowerCase();
  if (!configured || configured === "alecostantini87@gmail.com") return official;
  return configured;
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
  <body style="margin:0;background:#eceef3;font-family:'Segoe UI',Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eceef3;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:700px;background:#ffffff;border:1px solid #d9dce3;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="height:6px;background:linear-gradient(90deg,#0b1f8f,#f59e0b);font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="background:#ffffff;padding:24px 24px 18px 24px;border-bottom:1px solid #eceef3;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <img src="${appUrl}/img/logo-grooming-revolution.png" alt="Grooming Revolution" style="max-width:240px;width:100%;height:auto;display:block;" />
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <span style="display:inline-block;background:#f3f4f6;color:#0f172a;border:1px solid #e5e7eb;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:700;letter-spacing:0.3px;text-transform:uppercase;">
                        Comunicazione sistema
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:linear-gradient(135deg,#fff7ed,#eff6ff);padding:22px 24px 20px 24px;border-bottom:1px solid #eceef3;">
                <h1 style="margin:0 0 8px 0;color:#0f172a;font-size:26px;line-height:1.2;font-weight:800;">${escapeHtml(input.title)}</h1>
                <p style="margin:0;color:#334155;font-size:14px;line-height:1.45;">${escapeHtml(input.subtitle)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 24px 22px 24px;">
                ${input.bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e5e7eb;padding:16px 24px;background:#f8fafc;color:#64748b;font-size:12px;">
                <p style="margin:0 0 6px 0;color:#0f172a;font-weight:700;">Grooming Revolution</p>
                <p style="margin:0 0 6px 0;">Piattaforma professionale per la gestione della toelettatura.</p>
                <p style="margin:0 0 6px 0;">Supporto clienti: <a href="mailto:${escapeHtml(supportEmail)}" style="color:#0b1f8f;text-decoration:none;font-weight:600;">${escapeHtml(supportEmail)}</a></p>
                <p style="margin:0;">&copy; ${year} Grooming Revolution. Tutti i diritti riservati.</p>
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
  if (!client) return { ok: false as const, reason: "email_not_configured", detail: "RESEND_API_KEY non configurata" };

  try {
    const response = await client.emails.send({
      from: getFromAddress(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    if ((response as { error?: unknown } | null)?.error) {
      const detail = String((response as { error?: unknown }).error);
      console.error("email_send_failed_response", { to: input.to, subject: input.subject, detail });
      return { ok: false as const, reason: "email_send_failed", detail };
    }
    return { ok: true as const };
  } catch (error: unknown) {
    console.error("email_send_failed", {
      to: input.to,
      subject: input.subject,
      from: getFromAddress(),
      error,
    });
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false as const, reason: "email_send_failed", detail };
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
        Il tuo account è pronto.
      </p>
      <p style="margin:0 0 16px 0;font-size:14px;">
        <strong>attività:</strong> ${escapeHtml(input.businessName)}<br/>
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
        <li><strong>Operatori:</strong> configura operatori, disponibilità e KPI per monitorare produzione.</li>
        <li><strong>Sedi multiple:</strong> se hai più sedi, crea/gestisci sedi da <strong>Sedi</strong> e verifica timezone/valuta per ognuna.</li>
        <li><strong>Template messaggi:</strong> aggiorna testo WhatsApp/email in <strong>Impostazioni</strong>.</li>
      </ol>

      <h2 style="margin:0 0 8px 0;font-size:16px;">WhatsApp automatico e reminder</h2>
      <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;">
        Se colleghi WhatsApp API (Meta) in <strong>Impostazioni</strong>, il sistema può inviare reminder automatici giornalieri degli appuntamenti prenotati.
      </p>
      <ul style="margin:0 0 16px 18px;padding:0;font-size:14px;line-height:1.6;">
        <li>Inserisci <strong>Phone Number ID</strong></li>
        <li>Inserisci <strong>Access Token</strong></li>
        <li>Conferma versione API (default suggerita)</li>
        <li>Attiva l&apos;invio API</li>
      </ul>

      <h2 style="margin:0 0 8px 0;font-size:16px;">Import clienti</h2>
      <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;">
        Se hai già una lista clienti storica, scrivici a
        <a href="mailto:${escapeHtml(supportEmail)}" style="color:#b45309;">${escapeHtml(supportEmail)}</a>.
        Il team può assisterti nel caricamento iniziale per partire in modo pulito.
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
        Grooming Revolution è ottimizzato per uso quotidiano anche da smartphone:
        agenda, clienti, incassi e messaggi sono gestibili in mobilità.
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
    `benvenuto in Grooming Revolution. Il tuo account è pronto.\n` +
    `attività: ${input.businessName}\n` +
    `Sede: ${input.branchName || "Sede principale"}\n\n` +
    `Setup consigliato prima di partire:\n` +
    `1) Configura il listino con prezzi e durata media per servizio/taglia.\n` +
    `2) Imposta giorni/orari di apertura e pause della sede.\n` +
    `3) Crea team (manager/staff) e operatori con disponibilità.\n` +
    `4) Se hai più sedi, configura ciascuna sede (timezone/valuta).\n` +
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
  appUrlOverride?: string;
}) {
  const appUrl = (input.appUrlOverride || getAppUrl()).replace(/\/+$/, "");
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
        Il link seguente è valido per <strong>${input.expiresInMinutes} minuti</strong> e può essere usato una sola volta.
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
        Ti confermiamo che la password del tuo account è stata aggiornata${escapeHtml(by)}.
      </p>
      <p style="margin:0;font-size:13px;color:#6b7280;">
        Se non riconosci questa modifica, reimposta subito la password e contatta il supporto.
      </p>
    `,
  });

  const text =
    `La password del tuo account è stata aggiornata${by}.\n` +
    `Se non riconosci questa modifica, reimposta subito la password e contatta il supporto.\n`;

  return sendEmail({ to: input.to, subject, text, html });
}

export async function sendAccountDeletionRequestEmails(input: {
  ownerEmail: string;
  businessName: string;
  branchName: string;
  salonId: string;
  salonPhone?: string | null;
  salonAddress?: string | null;
  salonEmail?: string | null;
  country?: string | null;
  timezone?: string | null;
}) {
  const supportEmail = getSupportEmail();
  const supportSubject = "Richiesta eliminazione account SaaS";
  const supportHtml = renderShell({
    title: "Nuova richiesta eliminazione account",
    subtitle: "Intervento manuale richiesto",
    bodyHtml: `
      <p style="margin:0 0 10px 0;font-size:14px;">Un owner ha richiesto l'eliminazione irreversibile dell'account.</p>
      <p style="margin:0 0 4px 0;font-size:14px;"><strong>Email owner:</strong> ${escapeHtml(input.ownerEmail)}</p>
      <p style="margin:0 0 4px 0;font-size:14px;"><strong>Email account:</strong> ${escapeHtml(input.salonEmail || "-")}</p>
      <p style="margin:0 0 4px 0;font-size:14px;"><strong>Telefono:</strong> ${escapeHtml(input.salonPhone || "-")}</p>
      <p style="margin:0 0 4px 0;font-size:14px;"><strong>Indirizzo:</strong> ${escapeHtml(input.salonAddress || "-")}</p>
      <p style="margin:0 0 4px 0;font-size:14px;"><strong>Paese:</strong> ${escapeHtml(input.country || "-")}</p>
      <p style="margin:0 0 4px 0;font-size:14px;"><strong>Timezone:</strong> ${escapeHtml(input.timezone || "-")}</p>
      <p style="margin:0 0 4px 0;font-size:14px;"><strong>attività:</strong> ${escapeHtml(input.businessName)}</p>
      <p style="margin:0 0 4px 0;font-size:14px;"><strong>Sede:</strong> ${escapeHtml(input.branchName || "Sede principale")}</p>
      <p style="margin:0;font-size:14px;"><strong>Salon ID:</strong> ${escapeHtml(input.salonId)}</p>
    `,
  });
  const supportText =
    `Richiesta eliminazione account.\n` +
    `Owner: ${input.ownerEmail}\n` +
    `Email account: ${input.salonEmail || "-"}\n` +
    `Telefono: ${input.salonPhone || "-"}\n` +
    `Indirizzo: ${input.salonAddress || "-"}\n` +
    `Paese: ${input.country || "-"}\n` +
    `Timezone: ${input.timezone || "-"}\n` +
    `attività: ${input.businessName}\n` +
    `Sede: ${input.branchName || "Sede principale"}\n` +
    `Salon ID: ${input.salonId}\n`;
  const supportRes = await sendEmail({
    to: supportEmail,
    subject: supportSubject,
    text: supportText,
    html: supportHtml,
  });

  const ownerSubject = "Richiesta eliminazione account ricevuta";
  const ownerHtml = renderShell({
    title: "Richiesta ricevuta",
    subtitle: "Il team ti confermera la presa in carico a breve",
    bodyHtml: `
      <p style="margin:0 0 10px 0;font-size:14px;">
        Abbiamo ricevuto la tua richiesta di eliminazione account per ${escapeHtml(input.businessName)}.
      </p>
      <p style="margin:0 0 10px 0;font-size:14px;">
        Prima della chiusura definitiva, esporta la tua lista clienti in CSV da Impostazioni.
      </p>
      <p style="margin:0;font-size:14px;">
        L'eliminazione è irreversibile. Il team supporto ti contatterà a breve per conferma.
      </p>
    `,
  });
  const ownerText =
    `Richiesta eliminazione account ricevuta.\n` +
    `attività: ${input.businessName}\n` +
    `Prima di procedere esporta la lista clienti in CSV: l'eliminazione è irreversibile.\n`;
  const ownerRes = await sendEmail({
    to: input.ownerEmail,
    subject: ownerSubject,
    text: ownerText,
    html: ownerHtml,
  });

  return { ok: supportRes.ok && ownerRes.ok, supportRes, ownerRes };
}


