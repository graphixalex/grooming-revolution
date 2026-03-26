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
  const subject = "Benvenuto in Grooming Revolution - guida completa di attivazione";

  const html = renderShell({
    title: "Registrazione completata",
    subtitle: "Guida operativa completa per attivare il gestionale in modo corretto",
    bodyHtml: `
      <p style="margin:0 0 12px 0;font-size:14px;">
        Gentile Cliente, grazie per aver scelto Grooming Revolution.
        Il suo account e stato creato con successo.
      </p>
      <p style="margin:0 0 16px 0;font-size:14px;">
        <strong>Attivita:</strong> ${escapeHtml(input.businessName)}<br/>
        <strong>Sede:</strong> ${escapeHtml(input.branchName || "Sede principale")}
      </p>

      <div style="border:1px solid #f59e0b;background:#fffbeb;border-radius:10px;padding:12px 14px;margin:0 0 16px 0;">
        <p style="margin:0;font-size:13px;line-height:1.5;">
          Per lavorare senza errori di agenda, tempi o report, consigliamo di seguire i passaggi qui sotto in ordine.
        </p>
      </div>

      <h2 style="margin:0 0 8px 0;font-size:16px;">Passaggi obbligatori per partire</h2>
      <ol style="margin:0 0 16px 18px;padding:0;font-size:14px;line-height:1.65;">
        <li><strong>Listino prezzi (obbligatorio):</strong> apra <strong>Listino</strong> e configuri per ogni servizio almeno <strong>prezzo</strong> e <strong>durata media</strong>. Senza listino completo il sistema non puo stimare correttamente i tempi in agenda.</li>
        <li><strong>Operatori (obbligatorio):</strong> apra <strong>Impostazioni > Operatori</strong> e crei gli operatori reali della sede. <strong>L'agenda e gestita esclusivamente dagli operatori presenti in sede</strong> e dalle loro disponibilita.</li>
        <li><strong>Disponibilita operatori:</strong> per ogni operatore imposti giorni, fasce orarie, pause ed eventuali eccezioni. Questo evita sovrapposizioni e slot non coerenti.</li>
        <li><strong>Team e ruoli:</strong> in <strong>Impostazioni > Team e ruoli</strong> crei account manager/staff con i permessi corretti.</li>
        <li><strong>Sedi multiple (se presenti):</strong> verifichi in <strong>Sedi</strong> timezone e configurazione di ogni sede.</li>
      </ol>

      <h2 style="margin:0 0 8px 0;font-size:16px;">Cosa fa il gestionale</h2>
      <ul style="margin:0 0 16px 18px;padding:0;font-size:14px;line-height:1.6;">
        <li>Agenda intelligente con controllo conflitti e disponibilita reali.</li>
        <li>Schede clienti e pet con storico operativo.</li>
        <li>Booking online con validazione slot in tempo reale.</li>
        <li>Incassi e report KPI per monitorare performance e crescita.</li>
        <li>Workflow operativo multi-sede.</li>
      </ul>

      <h2 style="margin:0 0 8px 0;font-size:16px;">Configurazione WhatsApp API (consigliata)</h2>
      <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;">
        In <strong>Impostazioni > Template e WhatsApp</strong> puo attivare l'invio automatico promemoria tramite Meta WhatsApp API.
      </p>
      <ol style="margin:0 0 12px 18px;padding:0;font-size:14px;line-height:1.6;">
        <li>Inserisca <strong>Phone Number ID</strong> del numero WhatsApp Business.</li>
        <li>Inserisca <strong>Access Token</strong> generato su Meta.</li>
        <li>Confermi la versione API proposta dal sistema.</li>
        <li>Abiliti l'opzione <strong>Invio WhatsApp API</strong>.</li>
      </ol>
      <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;">
        Il gestionale imposta gia un testo professionale predefinito (modificabile in qualsiasi momento):
      </p>
      <div style="margin:0 0 16px 0;border:1px solid #e5e7eb;border-radius:10px;background:#f8fafc;padding:12px 14px;font-size:13px;line-height:1.55;">
        <strong>Template predefinito:</strong><br/>
        Gentile %nome_cliente%, le inviamo un promemoria per l'appuntamento di %nome_pet% previsto per il giorno %data_appuntamento% alle ore %orario_appuntamento% presso %nome_attivita%, %indirizzo_attivita%. Per eventuali modifiche o disdette, risponda pure a questo messaggio. Grazie.
      </div>
      <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#334155;">
        Variabili disponibili: <strong>%nome_cliente%</strong>, <strong>%nome_pet%</strong>, <strong>%data_appuntamento%</strong>, <strong>%orario_appuntamento%</strong>, <strong>%nome_attivita%</strong>, <strong>%indirizzo_attivita%</strong>.
      </p>

      <h2 style="margin:0 0 8px 0;font-size:16px;">Import clienti e avvio assistito</h2>
      <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;">
        Se possiede gia un archivio clienti, puo contattare il nostro team per supporto import iniziale e verifica qualita dati:
        <a href="mailto:${escapeHtml(supportEmail)}" style="color:#b45309;font-weight:700;">${escapeHtml(supportEmail)}</a>.
      </p>

      <h2 style="margin:0 0 8px 0;font-size:16px;">Supporto clienti</h2>
      <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;">
        In caso di dubbi tecnici o operativi, il servizio clienti e disponibile 24 ore su 24, 7 giorni su 7.
        Ci scriva a <a href="mailto:${escapeHtml(supportEmail)}" style="color:#0b1f8f;font-weight:700;">${escapeHtml(supportEmail)}</a> indicando sede e recapito.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px 0;">
        <tr>
          <td style="border-radius:10px;background:#111827;">
            <a href="${appUrl}/login" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
              Acceda ora e completi la configurazione
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:12px;color:#6b7280;">
        Se non ha effettuato Lei questa registrazione, ignori questa email e contatti subito il supporto.
      </p>
    `,
  });

  const text =
    `Gentile Cliente,\n\n` +
    `benvenuto in Grooming Revolution. Il suo account e attivo.\n` +
    `Attivita: ${input.businessName}\n` +
    `Sede: ${input.branchName || "Sede principale"}\n\n` +
    `Passaggi obbligatori per il corretto funzionamento:\n` +
    `1) Listino prezzi: configuri prezzo e durata media per ogni servizio.\n` +
    `2) Operatori: crei gli operatori della sede (l'agenda e gestita esclusivamente dagli operatori presenti in sede).\n` +
    `3) Disponibilita operatori: imposti giorni, orari, pause ed eccezioni.\n` +
    `4) Team e ruoli: aggiunga manager/staff con permessi adeguati.\n` +
    `5) Se multi-sede, verifichi timezone e configurazione per ogni sede.\n\n` +
    `WhatsApp API (consigliata):\n` +
    `- Inserisca Phone Number ID\n` +
    `- Inserisca Access Token\n` +
    `- Confermi versione API\n` +
    `- Attivi invio WhatsApp API\n` +
    `Template predefinito (modificabile):\n` +
    `Gentile %nome_cliente%, le inviamo un promemoria per l'appuntamento di %nome_pet% previsto per il giorno %data_appuntamento% alle ore %orario_appuntamento% presso %nome_attivita%, %indirizzo_attivita%. Per eventuali modifiche o disdette, risponda pure a questo messaggio. Grazie.\n\n` +
    `Accesso: ${appUrl}/login\n` +
    `Supporto clienti H24/7: ${supportEmail}\n`;

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
        Il link seguente Ã¨ valido per <strong>${input.expiresInMinutes} minuti</strong> e puÃ² essere usato una sola volta.
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
        Ti confermiamo che la password del tuo account Ã¨ stata aggiornata${escapeHtml(by)}.
      </p>
      <p style="margin:0;font-size:13px;color:#6b7280;">
        Se non riconosci questa modifica, reimposta subito la password e contatta il supporto.
      </p>
    `,
  });

  const text =
    `La password del tuo account Ã¨ stata aggiornata${by}.\n` +
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
      <p style="margin:0 0 4px 0;font-size:14px;"><strong>attivitÃ :</strong> ${escapeHtml(input.businessName)}</p>
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
    `attivitÃ : ${input.businessName}\n` +
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
        L'eliminazione Ã¨ irreversibile. Il team supporto ti contatterÃ  a breve per conferma.
      </p>
    `,
  });
  const ownerText =
    `Richiesta eliminazione account ricevuta.\n` +
    `attivitÃ : ${input.businessName}\n` +
    `Prima di procedere esporta la lista clienti in CSV: l'eliminazione Ã¨ irreversibile.\n`;
  const ownerRes = await sendEmail({
    to: input.ownerEmail,
    subject: ownerSubject,
    text: ownerText,
    html: ownerHtml,
  });

  return { ok: supportRes.ok && ownerRes.ok, supportRes, ownerRes };
}



