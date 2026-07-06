# Personal Finance Overview

A local-only personal finance tracker. All data stored in your browser's IndexedDB — no server, no account.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build for production

```bash
npm run build
npm run preview
```

## Features

- **Monthly budgets** — set income and savings goal per month; navigate with the arrow buttons in the header.
- **Expense tracking** — add expenses with amount, category, description, and date. Edit or delete any entry.
- **Spending chart** — donut chart showing spend per category; click any slice or row to drill down.
- **Category drill-down** — sortable table of all expenses in a category with inline edit and delete.
- **Category management** — add, rename, or delete categories (⚙️ button). Deleting a category moves its expenses to "Other".
- **Backup / Restore** — export all data as a JSON file; import to restore (replaces current data after confirmation).

## Data model

| Entity | Key fields |
|--------|-----------|
| Budget | `id` (YYYY-MM), `income`, `savingsGoal` |
| Expense | `id`, `amount`, `categoryId`, `description`, `date`, `month` |
| Category | `id`, `name`, `isDefault` |

All amounts are in Macedonian denars (MKD), formatted as `1.500 ден`.
