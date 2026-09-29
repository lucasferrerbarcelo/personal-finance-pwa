-- Schema for Personal Finance & Expense Tracker PWA

-- 1. Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('ARS', 'USD')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  payment_method TEXT NOT NULL DEFAULT 'transferencia' CHECK (payment_method IN ('efectivo', 'tarjeta_credito', 'tarjeta_debito', 'transferencia', 'otro')),
  installment_current INTEGER,
  installment_total INTEGER,
  parent_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migration for existing tables:
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'transferencia' CHECK (payment_method IN ('efectivo', 'tarjeta_credito', 'tarjeta_debito', 'transferencia', 'otro'));

-- 3. Debts
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('owe', 'owed')),
  person_name TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('ARS', 'USD')),
  status TEXT NOT NULL CHECK (status IN ('active', 'settled')) DEFAULT 'active',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Debt Payments
CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. View: v_debts_summary
CREATE OR REPLACE VIEW v_debts_summary AS
SELECT 
  d.id,
  d.type,
  d.person_name,
  d.total_amount,
  d.currency,
  d.status,
  d.note,
  d.created_at,
  COALESCE(SUM(dp.amount), 0) AS total_paid,
  GREATEST(0, d.total_amount - COALESCE(SUM(dp.amount), 0)) AS remaining_amount
FROM debts d
LEFT JOIN debt_payments dp ON d.id = dp.debt_id
GROUP BY d.id, d.type, d.person_name, d.total_amount, d.currency, d.status, d.note, d.created_at;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_parent_id ON transactions(parent_transaction_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);

-- Row Level Security (RLS) policies for personal finance app
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for categories" ON categories;
CREATE POLICY "Allow all for categories" ON categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for transactions" ON transactions;
CREATE POLICY "Allow all for transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for debts" ON debts;
CREATE POLICY "Allow all for debts" ON debts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for debt_payments" ON debt_payments;
CREATE POLICY "Allow all for debt_payments" ON debt_payments FOR ALL USING (true) WITH CHECK (true);

-- Default categories seed data
INSERT INTO categories (name, type, icon, color) VALUES
  ('Supermercado', 'expense', 'ShoppingCart', '#10b981'),
  ('Salidas y Comida', 'expense', 'Utensils', '#f59e0b'),
  ('Servicios e Impuestos', 'expense', 'Receipt', '#6366f1'),
  ('Transporte y Combustible', 'expense', 'Car', '#3b82f6'),
  ('Indumentaria', 'expense', 'Shirt', '#ec4899'),
  ('Tecnología y Gadgets', 'expense', 'Laptop', '#8b5cf6'),
  ('Salud y Farmacia', 'expense', 'HeartPulse', '#ef4444'),
  ('Entretenimiento', 'expense', 'Tv', '#14b8a6'),
  ('Educación', 'expense', 'GraduationCap', '#f97316'),
  ('Otros Gastos', 'expense', 'MoreHorizontal', '#64748b'),
  ('Sueldo', 'income', 'Briefcase', '#10b981'),
  ('Freelance / Proyectos', 'income', 'Code', '#06b6d4'),
  ('Inversiones y Dividendos', 'income', 'TrendingUp', '#84cc16'),
  ('Otros Ingresos', 'income', 'DollarSign', '#22c55e')
ON CONFLICT DO NOTHING;

-- 6. Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL UNIQUE, -- 'YYYY-MM'
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for budgets" ON budgets;
CREATE POLICY "Allow all for budgets" ON budgets FOR ALL USING (true) WITH CHECK (true);

-- 7. Credit Cards Configuration
CREATE TABLE IF NOT EXISTS credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  closing_day INTEGER NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for credit_cards" ON credit_cards;
CREATE POLICY "Allow all for credit_cards" ON credit_cards FOR ALL USING (true) WITH CHECK (true);

-- Seed default card if table is empty
INSERT INTO credit_cards (name, closing_day, due_day, is_default)
SELECT 'Visa Galicia', 24, 5, true
WHERE NOT EXISTS (SELECT 1 FROM credit_cards);

-- Migrations for transactions table: credit card statement cycle
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS statement_month TEXT; -- 'YYYY-MM'
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS statement_paid BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_statement_month ON transactions(statement_month);

