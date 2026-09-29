export type TransactionType = 'expense' | 'income';
export type Currency = 'ARS' | 'USD';
export type DebtType = 'owe' | 'owed';
export type DebtStatus = 'active' | 'settled';
export type PaymentMethod = 'efectivo' | 'tarjeta_credito' | 'tarjeta_debito' | 'transferencia' | 'otro';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
  created_at?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  category_id: string | null;
  date: string; // YYYY-MM-DD
  note: string | null;
  payment_method?: PaymentMethod;
  installment_current: number | null;
  installment_total: number | null;
  parent_transaction_id: string | null;
  created_at: string;
  category?: Category | null;
}

export interface Debt {
  id: string;
  type: DebtType;
  person_name: string;
  total_amount: number;
  currency: Currency;
  status: DebtStatus;
  note: string | null;
  created_at: string;
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
}

export interface DebtSummary extends Debt {
  total_paid: number;
  remaining_amount: number;
  payments?: DebtPayment[];
}

export interface Budget {
  id: string;
  month: string; // 'YYYY-MM'
  amount: number;
  currency: Currency;
  created_at?: string;
}

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Category, 'id'>>;
        Relationships: [];
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Transaction, 'id'>>;
        Relationships: [];
      };
      debts: {
        Row: Debt;
        Insert: Omit<Debt, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Debt, 'id'>>;
        Relationships: [];
      };
      debt_payments: {
        Row: DebtPayment;
        Insert: Omit<DebtPayment, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<DebtPayment, 'id'>>;
        Relationships: [];
      };
      budgets: {
        Row: Budget;
        Insert: Omit<Budget, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Budget, 'id'>>;
        Relationships: [];
      };
    };
    Views: {
      v_debts_summary: {
        Row: DebtSummary;
      };
    };
  };
}
