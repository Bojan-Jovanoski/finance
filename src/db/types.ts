export interface Budget {
  id: string; // "YYYY-MM"
  income: number;
  savingsGoal: number;
}

export interface Category {
  id?: string; // Firestore document ID
  name: string;
  isDefault: boolean;
  monthlyLimit?: number;
}

export interface Expense {
  id?: string; // Firestore document ID
  amount: number;
  categoryId: string;
  description: string;
  date: string; // "YYYY-MM-DD"
  month: string; // "YYYY-MM"
  createdBy?: string; // UID of the member who added it
  createdByName?: string; // display name captured at add time (for history)
  createdAt?: unknown; // Firestore server timestamp
}

export interface Household {
  id?: string;
  members: string[]; // Firebase Auth UIDs allowed into this household
  createdBy: string;
  createdAt?: unknown;
}

export interface ExportData {
  version: 1;
  exportedAt: string;
  budgets: Budget[];
  expenses: Expense[];
  categories: Category[];
}
