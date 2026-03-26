# Grooming Revolution

IT: Gestionale SaaS multi-tenant per toelettatura cani, con UI in italiano.
EN: Multi-tenant SaaS management platform for dog grooming businesses, with Italian UI.

## Highlights (IT / EN)

- Agenda smart con FullCalendar / Smart calendar with FullCalendar
- Incasso rapido POS/CASH + mancia / Fast POS/CASH checkout + tips
- WhatsApp manuale con template precompilato / Manual WhatsApp send with prefilled template
- Multi-sede con sede attiva / Multi-branch with active branch switch
- Contabilita per singola sede o tutte le sedi / Accounting by single branch or all branches
- Paese e valuta automatici / Automatic country and currency handling
- Trial fino a 100 clienti, poi FULL 20 EUR/mese + IVA / Trial up to 100 clients, then FULL at 20 EUR/month + VAT

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4
- PostgreSQL + Prisma
- NextAuth Credentials + argon2
- Zod validation
- Paddle Billing (hosted checkout + webhook endpoint)

## Funzionalita / Features

- Auth: `/login`, `/register`
- Dashboard KPI: `/dashboard`
- Agenda / Planner: `/planner`
  - Nuovo appuntamento cliente nuovo/esistente / New appointment for new or existing clients
  - Durata 15-300 min / Duration 15-300 min
  - Trattamenti multipli / Multiple treatments
  - Stati appuntamento / Appointment statuses
  - Incasso + mancia / Checkout + tip
  - Prompt WhatsApp precompilato / Prefilled WhatsApp prompt
- Clienti / Clients: `/clients`, `/clients/[id]`
- Cani / Dogs: `/dogs/[id]`
- Movimenti / Payments: `/payments`
  - Filtri periodo / Date filtering
  - Export CSV coerente con scope / CSV export consistent with selected scope
- Listino intelligente / Smart pricing: `/pricing`
- Report avanzati / Advanced reports: `/reports`
- Multi-sede / Multi-branch: `/branches`
- Impostazioni / Settings: `/settings`
- Billing: `/billing`

## Regole business / Business Rules

- Trial: max 100 clienti per tenant / max 100 clients per tenant
- FULL plan: 20 EUR/month + VAT
- Max 4 dogs per client
- Working-hours validation (including breaks)
- Overlap blocked by default (configurable)
- Soft delete for clients/dogs/appointments

## Multi-branch Data Model

IT:
- Dati operativi separati per sede selezionata (agenda/clienti/incassi)
- In contabilia, owner puo scegliere singola sede o tutte le sedi

EN:
- Operational data is isolated per selected branch (planner/clients/revenue)
- In accounting views, owner can select one branch or all branches

## Country & Currency Automation

IT:
- In registrazione imposti attivita, sede, indirizzo, paese
- Valuta assegnata automaticamente dal paese
- In modifica sede, cambio paese aggiorna automaticamente la valuta

EN:
- During registration you set business, branch, address, country
- Currency is auto-assigned from country
- In branch edit, changing country auto-updates currency

## Prisma Models (core)

- `SalonGroup`, `Salon`, `User`
- `Client`, `Dog`, `QuickTag`, `DogQuickTag`
- `Treatment`, `ServicePriceRule`
- `Appointment`, `AppointmentTreatment`
- `Transaction`
- `AuditLog`

## Local Setup

### Prerequisites

- Node.js 20+
- PostgreSQL (local or remote)

### 1) Install dependencies

```bash
npm install
```

### 2) Environment

Copy `.env.example` to `.env` and fill values.

Minimal example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/grooming_revolution?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-this-long-secret"
PADDLE_ENV="sandbox"
PADDLE_API_KEY="pdl_sdbx_apikey_xxx"
PADDLE_CLIENT_TOKEN="test_xxx"
PADDLE_WEBHOOK_SECRET="pdl_ntfset_xxx"
PADDLE_PRICE_ID_PRO="pri_xxx"
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
RESEND_API_KEY=""
EMAIL_FROM="Grooming Revolution <onboarding@resend.dev>"
SUPPORT_EMAIL="support@grooming-revolution.com"
```

### 3) Prisma migrate + generate

```bash
npx prisma migrate deploy
npm run prisma:generate
```

### 4) Optional demo seed

```bash
npm run prisma:seed
```

Demo credentials:

- `owner@groomingrevolution.local`
- `Password123!`

### 5) Start dev server

```bash
npm run dev
```

App URL: `http://localhost:3000`

## Useful Scripts

```bash
npm run dev
npm run build
npm start
npm run lint
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run db:push
```

## Main API Endpoints

- `POST/GET/PATCH /api/appointments`
- `POST/GET/PATCH/DELETE /api/branches`
- `POST/GET/PATCH /api/settings`
- `GET /api/payments/export`
- `POST/GET/PATCH /api/pricing-rules`
- `POST /api/active-salon`
- `POST /api/paddle/webhook`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

## Billing Note

IT: Trial fino a 100 clienti, poi FULL a 20 EUR/mese + IVA (addebito automatico Paddle con checkout ospitato).
EN: Trial up to 100 clients, then FULL at 20 EUR/month + VAT (Paddle automatic billing with hosted checkout).

## Transactional Emails

- Provider consigliato (free tier): Resend
- Eventi coperti:
  - Registrazione completata
  - Cambio password account (owner/staff)
  - Recupero password con token via email
- Variabili richieste:
  - `RESEND_API_KEY`
  - `EMAIL_FROM`
  - `SUPPORT_EMAIL` (opzionale, default interno)

## Legal Note

IT: I testi legali inclusi sono placeholder e richiedono revisione legale professionale.
EN: Included legal texts are placeholders and require professional legal review.
