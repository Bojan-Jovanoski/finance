export interface Budget {
  id: string; // "YYYY-MM"
  income: number;
  savingsGoal: number;
}

export interface Category {
  id?: number;
  name: string;
  isDefault: boolean;
}

export interface Expense {
  id?: number;
  amount: number;
  categoryId: number;
  description: string;
  date: string; // "YYYY-MM-DD"
  month: string; // "YYYY-MM" derived from date
}

export interface ExportData {
  version: 1;
  exportedAt: string;
  budgets: Budget[];
  expenses: Expense[];
  categories: Category[];
}
