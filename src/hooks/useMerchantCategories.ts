import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { firestore } from '@/db/firebase';
import { HOUSEHOLD_ID } from '@/config/household';

// "Tinex DOOEL, Skopje" and "TINEX dooel skopje" should be the same shop.
export function merchantKey(merchant: string): string {
  return merchant.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

// The category each shop was last recorded under after a receipt scan,
// shared by the household so scans learn from both partners' corrections.
export function useMerchantCategories() {
  const [byMerchant, setByMerchant] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    return onSnapshot(collection(firestore, 'households', HOUSEHOLD_ID, 'merchantCategories'), (snap) => {
      setByMerchant(new Map(snap.docs.map((d) => [d.id, d.data().categoryId as string])));
    });
  }, []);

  function categoryForMerchant(merchant: string): string | undefined {
    const key = merchantKey(merchant);
    return key ? byMerchant.get(key) : undefined;
  }

  async function rememberMerchantCategory(merchant: string, categoryId: string) {
    const key = merchantKey(merchant);
    if (!key || byMerchant.get(key) === categoryId) return;
    await setDoc(doc(firestore, 'households', HOUSEHOLD_ID, 'merchantCategories', key), {
      merchant: merchant.trim(),
      categoryId,
    });
  }

  return { categoryForMerchant, rememberMerchantCategory };
}
