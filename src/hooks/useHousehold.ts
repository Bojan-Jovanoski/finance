import { useState, useEffect } from 'react';
import {
  doc, onSnapshot, setDoc, updateDoc, arrayUnion, serverTimestamp,
} from 'firebase/firestore';
import { firestore } from '@/db/firebase';
import { HOUSEHOLD_ID } from '@/config/household';
import { migratePersonalDataToHousehold } from '@/db/migrate';
import type { Household } from '@/db/types';

export type HouseholdStatus =
  | 'loading'
  | 'linked' // current user is a member
  | 'exists-not-member' // household exists but user isn't in it yet
  | 'none'; // no household exists yet

export function useHousehold(uid: string) {
  const [household, setHousehold] = useState<Household | null | undefined>(undefined);

  useEffect(() => {
    const ref = doc(firestore, 'households', HOUSEHOLD_ID);
    return onSnapshot(
      ref,
      (snap) => setHousehold(snap.exists() ? ({ id: snap.id, ...snap.data() } as Household) : null),
      // A read error (shouldn't happen — the doc is readable by any signed-in
      // user) is treated as "not linked" so the setup screen can still show.
      () => setHousehold(null),
    );
  }, [uid]);

  const status: HouseholdStatus =
    household === undefined ? 'loading'
      : household === null ? 'none'
        : household.members.includes(uid) ? 'linked'
          : 'exists-not-member';

  // First-time setup: create the household with this user as the sole member,
  // then copy their existing personal data in (non-destructive).
  async function createHousehold() {
    await setDoc(doc(firestore, 'households', HOUSEHOLD_ID), {
      members: [uid],
      createdBy: uid,
      createdAt: serverTimestamp(),
    });
    await migratePersonalDataToHousehold(uid, HOUSEHOLD_ID);
  }

  // Add a partner by their link code (their Firebase Auth UID).
  async function addMember(memberUid: string) {
    await updateDoc(doc(firestore, 'households', HOUSEHOLD_ID), {
      members: arrayUnion(memberUid.trim()),
    });
  }

  return { household, status, householdId: HOUSEHOLD_ID, createHousehold, addMember };
}
