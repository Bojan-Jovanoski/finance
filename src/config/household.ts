// Single shared household for this app. All finance data lives under
// households/{HOUSEHOLD_ID}/... in Firestore, so both signed-in accounts read
// and write the same budgets, expenses and categories.
//
// Access is gated in firestore.rules by Firebase Auth UID (opaque, non-personal
// identifiers) — no emails or names live in the repo. Attribution for the
// added-items history is captured at write time from the signed-in user's
// Google profile (see useExpenses), so display names come from Firebase at
// runtime rather than being hardcoded here.
export const HOUSEHOLD_ID = 'jovanoski-home';
