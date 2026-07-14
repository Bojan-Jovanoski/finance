# Personal Finance Overview

A shared household finance tracker for a two-person budget. Set a monthly income
and savings goal, log expenses by category, and see where the money went — synced
live between both partners. Installable as a PWA and works offline.

Built with React + Vite + TypeScript + Tailwind + Recharts, backed by Firebase
(Google Auth + Firestore). Amounts are in Macedonian denars (MKD), formatted as
`1.500 ден`.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in your Firebase project config
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

The `VITE_FIREBASE_*` values come from your Firebase project settings. Access is
additionally gated by `VITE_ALLOWED_EMAILS` (comma-separated allowlist); leave it
empty to allow any Google account.

## Build for production

```bash
npm run build
npm run preview
```

## How data is shared

Data is **not** stored per-user. Both partners share a single household document
at `households/{HOUSEHOLD_ID}` (`HOUSEHOLD_ID` is a constant in
`src/config/household.ts`), with budgets, expenses, and categories as
subcollections underneath it.

- The first user creates the household and migrates any existing data.
- The partner signs in and shares their opaque Firebase UID ("link code"); an
  existing member adds it in the Household modal. There is no self-join.
- Access is enforced in `firestore.rules` by membership
  (`request.auth.uid in members`). Rules are deployed via the Firebase Console.

Expenses capture attribution (`createdBy` / `createdByName` / `createdAt`) from
the Google profile at write time, which powers the history feed and the
"who spent what" breakdown.

## Offline support

Firestore uses a persistent IndexedDB cache (`src/db/firebase.ts`). Reads are
served from cache when offline and writes are queued locally, then synced once
the connection returns — so logging an expense on a phone with no signal still
works.

## Features

- **Monthly budgets** — set income and savings goal per month; navigate months
  from the header.
- **Expense tracking** — add expenses with amount, category, memo, and date.
  Edit or delete any entry.
- **Spending chart** — donut chart of spend per category; click a slice or row to
  drill down.
- **Category drill-down** — sortable table of all expenses in a category with
  inline edit and delete.
- **Category management** — add, rename, or delete categories, each with an
  optional monthly limit. Deleting a category moves its expenses to "Other".
- **Analysis** — headline metrics, who-spent-what, month-over-month movers, and
  categories over their limit.
- **History** — a live feed of recently added items across the household, with an
  unread badge for entries added by your partner.
- **Backup / Restore** — export all data as JSON; import to restore.

## Data model

| Entity   | Key fields |
|----------|-----------|
| Budget   | `id` (YYYY-MM), `income`, `savingsGoal` |
| Expense  | `id`, `amount`, `categoryId`, `description`, `date`, `month`, `createdBy`, `createdByName`, `createdAt` |
| Category | `id`, `name`, `isDefault`, `monthlyLimit?` |
| Household| `id`, `members[]`, `createdBy`, `createdAt` |
</content>
</invoke>
