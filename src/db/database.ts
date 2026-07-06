import Dexie from 'dexie';
import type { Budget, Category, Expense } from './types';

class FinanceDB extends Dexie {
  budgets!: Dexie.Table<Budget, string>;
  expenses!: Dexie.Table<Expense, number>;
  categories!: Dexie.Table<Category, number>;

  constructor() {
    super('PersonalFinanceDB');
    this.version(1).stores({
      budgets: 'id',
      expenses: '++id, month, categoryId',
      categories: '++id, name',
    });
  }
}

export const db = new FinanceDB();

const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Electricity', isDefault: true },
  { name: 'Water', isDefault: true },
  { name: 'Internet/Phone', isDefault: true },
  { name: 'Bills Other', isDefault: true },
  { name: 'Subscriptions', isDefault: true },
  { name: 'Groceries', isDefault: true },
  { name: 'Transport', isDefault: true },
  { name: 'Dining Out', isDefault: true },
  { name: 'Health', isDefault: true },
  { name: 'Entertainment', isDefault: true },
  { name: 'Clothing', isDefault: true },
  { name: 'Household', isDefault: true },
  { name: 'Other', isDefault: true },
];

db.on('populate', () => {
  db.categories.bulkAdd(DEFAULT_CATEGORIES);
});
