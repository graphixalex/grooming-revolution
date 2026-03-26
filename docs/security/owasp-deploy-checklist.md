# OWASP Deploy Checklist (Grooming Revolution)

## A. Configurazione e segreti
- [ ] Tutte le variabili critiche presenti in `Production` su Vercel.
- [ ] `NEXTAUTH_SECRET` lungo e ruotato periodicamente.
- [ ] `PADDLE_WEBHOOK_SECRET`, `PADDLE_API_KEY`, `PADDLE_PRICE_ID_PRO` verificati.
- [ ] `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` presenti e validi.
- [ ] `CRON_SECRET` impostato e non riutilizzato altrove.
- [ ] Nessun segreto nel repository Git.

## B. Trasporto e header
- [ ] HTTPS forzato su dominio principale.
- [ ] Header HSTS attivo in produzione.
- [ ] Header CSP attivo e coerente con provider attuali (Paddle).
- [ ] `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` attivi.

## C. Auth, sessione e autorizzazione
- [ ] Login con rate-limit per email + IP.
- [ ] Cookie sessione `HttpOnly`, `Secure` (prod), `SameSite` configurati.
- [ ] Verifica ruoli per endpoint sensibili (`OWNER`/`MANAGER`).
- [ ] Accesso multi-sede limitato al gruppo corretto.

## D. API e input validation
- [ ] Tutti gli endpoint privati richiedono sessione.
- [ ] Endpoint pubblici con rate-limit distribuito.
- [ ] Validazioni input server-side (Zod/guardie) su payload JSON.
- [ ] Nessun uso di query SQL dinamiche non parametrizzate.

## E. Billing e webhook
- [ ] Firma webhook Paddle verificata.
- [ ] Anti-replay webhook attivo (idempotenza + finestra temporale firma).
- [ ] Checkout e portal accessibili solo a ruoli autorizzati.
- [ ] Eventi billing monitorati nei log (`subscription.*`, `transaction.completed`).

## F. Logging, monitoraggio e incident response
- [ ] Error logging attivo su Vercel per API critiche.
- [ ] Alert su spike 429 / 401 / 5xx.
- [ ] Procedura di rollback documentata.
- [ ] Runbook incidenti: pagamento, auth, booking pubblico.

## G. Dipendenze e supply chain
- [ ] `npm audit` eseguito prima del deploy.
- [ ] Vulnerabilità high/critical patchate o accettate con motivazione documentata.
- [ ] Versioni framework (Next/Prisma) mantenute aggiornate.

## H. Database e backup
- [ ] Backup/point-in-time restore verificato su Neon.
- [ ] Migration applicate in produzione prima del traffico reale.
- [ ] Utenti DB con privilegi minimi necessari.

## I. Privacy e compliance
- [ ] Privacy, Terms, Cookies, Refund, DPA pubblicati e linkati nell'app.
- [ ] Clausole proprietà/export/cancellazione dati presenti.
- [ ] Trattamento dati cliente coerente con GDPR e ruoli titolare/responsabile.

## J. Test finale pre go-live
- [ ] Login, reset password, billing checkout, webhook e booking testati end-to-end.
- [ ] Test abuso base: flood su booking slots/request restituisce 429.
- [ ] Verifica che pagine private siano `noindex`.
