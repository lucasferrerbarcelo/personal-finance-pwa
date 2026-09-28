# Personal Finance & Expense Tracker PWA

Mobile-first Personal Finance & Expense Tracker built with **Next.js 14 (App Router)**, **Tailwind CSS**, **Recharts**, **Lucide React**, and **Supabase**, featuring bi-currency tracking (ARS & USD), credit card installment projections, debt management, and an integrated **Telegram Bot Webhook**.

---

## 🚀 Features

### 1. Dashboard
- **KPI Cards:** Monthly expenses, incomes, and net balance in **ARS ($)** and **USD (U$S)**.
- **Active Debts Summary:** Real-time balances for "Me deben" vs "Debo".
- **Interactive Recharts Breakdown:** Donut and Bar charts with category percentages, hover tooltips, and ARS/USD toggle.
- **Installment Commitments Snapshot:** 3-month forecast of upcoming credit card obligations.
- **Recent Movements:** Last 5 transactions with inline editing, deletion, and installment indicators (`Cuota 2/6`).

### 2. Movimientos (Transactions)
- Grouped list by date with category icons and color badges.
- Filtering by **Month**, **Currency (ARS / USD)**, **Type (Gasto / Ingreso)**, and **Category**.
- Real-time search by concept, note, or category.
- **"+ Nuevo Movimiento" Modal:** Supports single payments or multi-month installments (cuotas) with automatic schedule generation.

### 3. Deudas & Préstamos
- Two dedicated views:
  - **"Me deben" (owed to me)**
  - **"Debo" (I owe)**
- Individual cards with total amount, paid amount, remaining balance, and visual progress bar.
- **"+ Registrar Pago" Modal:** Log partial payments. If the balance reaches 0, the debt is automatically marked as `settled` with celebratory confetti!
- **"+ Nueva Deuda" Modal:** Easily register new loans or debts.
- Payments history accordion per debt.

### 4. Cuotas (Installments Timeline)
- **6-Month Projection Bar Chart:** Visualizes committed credit card expenses across the next 6 months.
- **Itemized Monthly Cards:** Details of each installment (item name, category, cuota index e.g. `2/6`, amount, and currency).

### 5. Telegram Webhook Endpoint (`app/api/telegram/route.ts`)
Log transactions directly from Telegram with natural language:
- `3500 cafe` ➔ Gasto ARS de $ 3.500
- `25 usd hosting` ➔ Gasto USD de U$S 25
- `60000 zapatillas 3 cuotas` ➔ Gasto en 3 cuotas mensuales de $ 20.000
- `debo 50000 mecanico` ➔ Registra deuda "Debo" de $ 50.000
- `me debe 20000 juan` ➔ Registra deuda "Me deben" de $ 20.000
- `pago 10000 deuda juan` ➔ Registra pago y responde con saldo restante
- `/resumen` ➔ Resumen mensual en ARS y USD
- `/ayuda` ➔ Muestra el listado de comandos

---

## 🛠️ Setup & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
TELEGRAM_MY_CHAT_ID=your-numeric-telegram-chat-id
```

> **Note:** If Supabase keys are not set, the app automatically runs in **Demo Mode** with realistic mock data and local storage persistence so you can test all features right away.

### 3. Supabase Database Schema
Run the SQL script located in [`supabase/schema.sql`](./supabase/schema.sql) in your Supabase SQL Editor. It creates:
- `categories`
- `transactions`
- `debts`
- `debt_payments`
- `v_debts_summary` (View)
- Performance indexes and default category seeds

### 4. Setting up Telegram Webhook
To connect your Telegram bot to the deployed app:
```bash
curl -F "url=https://YOUR_DOMAIN.vercel.app/api/telegram" https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```

### 5. Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser or mobile device.
