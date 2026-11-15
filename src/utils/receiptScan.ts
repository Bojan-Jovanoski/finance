import { auth } from '@/db/firebase';
import type { Category } from '@/db/types';

// Receipt scanning goes to the self-hosted receipt-server (see receipt-server/).
// The photo is only resized in memory and sent once; it is never stored.
const API_URL = (import.meta.env.VITE_RECEIPT_API_URL ?? '').replace(/\/$/, '');
const MAX_SIDE = 1600;
const TIMEOUT_MS = 90_000;

export const receiptScanEnabled = API_URL !== '';

export interface ScannedReceipt {
  amount: number | null;
  date: string | null; // "YYYY-MM-DD"
  merchant: string | null;
  categoryId: string | null;
}

async function authHeader(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('You need to be signed in to scan a receipt.');
  return `Bearer ${await user.getIdToken()}`;
}

// Shrinks the photo so uploads stay small and the model reads it faster.
async function toJpegBase64(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('That file could not be opened as a picture.');
  });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
}

// Asks the server to load the model while the user is still picking a photo.
export function warmReceiptModel(): void {
  if (!receiptScanEnabled) return;
  authHeader()
    .then((authorization) => fetch(`${API_URL}/warm`, { method: 'POST', headers: { Authorization: authorization } }))
    .catch(() => {});
}

export async function scanReceipt(file: File, categories: Category[]): Promise<ScannedReceipt> {
  const image = await toJpegBase64(file);
  const body = JSON.stringify({
    image,
    categories: categories.filter((c) => c.id).map((c) => ({ id: c.id, name: c.name })),
  });

  let response: Response;
  try {
    response = await fetch(`${API_URL}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: await authHeader() },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new Error('Reading the receipt took too long. Try again or enter it by hand.');
    }
    throw new Error('Could not reach the receipt reader. Is the home PC on?');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `Receipt reader error (${response.status}).`);
  return data as ScannedReceipt;
}
