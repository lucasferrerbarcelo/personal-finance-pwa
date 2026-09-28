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
  installment_current INTEGER,
  installment_total INTEGER,
  parent_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
