// Receipt server: verifies the caller's Firebase sign-in, sends the receipt
// photo to a local Ollama vision model and returns a suggested expense entry.
//
// Images are only ever held in memory for the duration of a request. They are
// never written to disk and never logged.

import http from 'node:http';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const config = {
  projectId: process.env.FIREBASE_PROJECT_ID?.trim(),
  allowedEmails: splitList(process.env.ALLOWED_EMAILS).map((e) => e.toLowerCase()),
  allowedOrigins: splitList(process.env.ALLOWED_ORIGINS),
  ollamaUrl: (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, ''),
  model: process.env.OLLAMA_MODEL || 'qwen3-vl:8b-instruct',
  port: Number(process.env.PORT) || 8787,
};

const MAX_BODY_BYTES = 6 * 1024 * 1024;
const OLLAMA_TIMEOUT_MS = 90_000;
const KEEP_ALIVE = '30m';

if (!config.projectId) fail('FIREBASE_PROJECT_ID is not set (see .env.example).');
if (config.allowedEmails.length === 0) fail('ALLOWED_EMAILS is empty; refusing to start an open server.');

initializeApp({ projectId: config.projectId });
const auth = getAuth();

function splitList(value) {
  return (value ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

function fail(message) {
  console.error(`[config] ${message}`);
  process.exit(1);
}

function log(message) {
  console.log(`${new Date().toISOString()} ${message}`);
}

// ---------------------------------------------------------------------------
// HTTP helpers

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && config.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, 'Image is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new HttpError(400, 'Body must be JSON.'));
      }
    });
    req.on('error', reject);
  });
}

async function authenticate(req) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'Missing sign-in token.');

  let decoded;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    throw new HttpError(401, 'Invalid or expired sign-in token.');
  }
  const email = decoded.email?.toLowerCase();
  if (!email || !config.allowedEmails.includes(email)) {
    throw new HttpError(403, 'This account is not allowed to scan receipts.');
  }
  return email;
}

// ---------------------------------------------------------------------------
// Ollama

// The GPU can only work on one image at a time, so scans run one after another.
let queue = Promise.resolve();
function enqueue(task) {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

function buildPrompt(categoryNames) {
  return [
    'You are reading a photo of a receipt, invoice or payment slip from North Macedonia.',
    'Extract the following and answer only with JSON matching the schema.',
    '',
    'total: the FINAL amount paid, in Macedonian denars (MKD), as a number.',
    '- Look for "ВКУПНО", "ВКУПНО ЗА ПЛАЌАЊЕ", "ЗА НАПЛАТА", "ИЗНОС", "TOTAL".',
    '- Do NOT use subtotals, VAT/ДДВ lines, tax bases, cash given ("ПЛАТЕНО", "ГОТОВИНА") or change ("КУСУР", "ВРАТЕНО").',
    '- Receipts use a comma or a dot for decimals (e.g. "1.250,00" means 1250). Return a plain number like 1250.',
    '',
    'date: the purchase or issue date as YYYY-MM-DD, or null if you cannot read it.',
    '- Dates are written day first, e.g. 05.11.2026 means 2026-11-05.',
    '',
    'merchant: the short name of the shop or company (e.g. "Vero", "EVN"), or null.',
    '',
    'category: exactly one of the allowed categories below, chosen from what was bought and who issued it.',
    `Allowed categories: ${categoryNames.map((n) => `"${n}"`).join(', ')}.`,
    'Hints (only if such a category exists in the list):',
    '- Supermarkets and markets (Vero, Ramstore, Tinex, KAM, Stokomak, Kipper, Lidl) → groceries.',
    '- EVN or electricity bills → electricity.',
    '- Водовод / water utility bills → water.',
    '- A1, Makedonski Telekom, telephone or internet bills → internet/phone.',
    '- Fuel stations (Lukoil, Makpetrol, OKTA), parking, taxi, bus → transport.',
    '- Restaurants, cafés, bakeries, fast food, food delivery → dining out.',
    '- Pharmacies (аптека), doctors, clinics → health.',
    'If nothing fits well, use "Other" when it is in the list.',
  ].join('\n');
}

function buildSchema(categoryNames) {
  return {
    type: 'object',
    properties: {
      total: { type: 'number' },
      date: { type: ['string', 'null'] },
      merchant: { type: ['string', 'null'] },
      category: { type: 'string', enum: categoryNames },
    },
    required: ['total', 'date', 'merchant', 'category'],
  };
}

async function askModel(imageBase64, categoryNames) {
  let response;
  try {
    response = await fetch(`${config.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
      body: JSON.stringify({
        model: config.model,
        stream: false,
        keep_alive: KEEP_ALIVE,
        format: buildSchema(categoryNames),
        options: { temperature: 0 },
        messages: [{ role: 'user', content: buildPrompt(categoryNames), images: [imageBase64] }],
      }),
    });
  } catch (err) {
    if (err.name === 'TimeoutError') throw new HttpError(504, 'The model took too long to read the receipt.');
    throw new HttpError(502, 'The model is not running on the home PC.');
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    log(`ollama error ${response.status}: ${detail.slice(0, 300)}`);
    throw new HttpError(502, 'The model could not read the receipt.');
  }
  const data = await response.json();
  try {
    return JSON.parse(data.message?.content ?? '');
  } catch {
    throw new HttpError(502, 'The model returned an unreadable answer.');
  }
}

function toEntry(raw, categories) {
  const amount = Math.round(Number(raw.total));
  const date = typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : null;
  const merchant = typeof raw.merchant === 'string' && raw.merchant.trim() ? raw.merchant.trim().slice(0, 200) : null;
  const wanted = String(raw.category ?? '').trim().toLowerCase();
  const category = categories.find((c) => c.name.trim().toLowerCase() === wanted);
  return {
    amount: Number.isFinite(amount) && amount > 0 ? amount : null,
    date,
    merchant,
    categoryId: category?.id ?? null,
  };
}

// ---------------------------------------------------------------------------
// Routes

async function handleScan(req, res) {
  const started = Date.now();
  const email = await authenticate(req);
  const body = await readJsonBody(req);

  const image = typeof body.image === 'string' ? body.image.replace(/^data:image\/\w+;base64,/, '') : '';
  if (!image) throw new HttpError(400, 'No image was sent.');

  const categories = Array.isArray(body.categories)
    ? body.categories
        .filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string' && c.name.trim())
        .map((c) => ({ id: c.id, name: c.name.trim() }))
    : [];
  if (categories.length === 0) throw new HttpError(400, 'No categories were sent.');

  const raw = await enqueue(() => askModel(image, categories.map((c) => c.name)));
  const entry = toEntry(raw, categories);

  const categoryName = categories.find((c) => c.id === entry.categoryId)?.name ?? '-';
  log(`scan ok ${email} ${Date.now() - started}ms amount=${entry.amount} date=${entry.date} merchant=${entry.merchant} category=${categoryName}`);
  sendJson(res, 200, entry);
}

// Loads the model into VRAM ahead of a scan (called when the photo picker opens).
async function handleWarm(req, res) {
  await authenticate(req);
  fetch(`${config.ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, keep_alive: KEEP_ALIVE }),
  }).catch(() => {});
  sendJson(res, 202, { ok: true });
}

async function handleHealth(_req, res) {
  let ollama = false;
  let modelInstalled = false;
  try {
    const tags = await fetch(`${config.ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) }).then((r) => r.json());
    ollama = true;
    modelInstalled = (tags.models ?? []).some((m) => m.name === config.model || m.model === config.model);
  } catch {
    // Ollama is not reachable.
  }
  sendJson(res, ollama && modelInstalled ? 200 : 503, { ok: ollama && modelInstalled, ollama, model: config.model, modelInstalled });
}

const server = http.createServer(async (req, res) => {
  setCors(req, res);
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
    } else if (req.method === 'POST' && path === '/scan') {
      await handleScan(req, res);
    } else if (req.method === 'POST' && path === '/warm') {
      await handleWarm(req, res);
    } else if (req.method === 'GET' && path === '/health') {
      await handleHealth(req, res);
    } else {
      sendJson(res, 404, { error: 'Not found.' });
    }
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) log(`error ${err?.stack ?? err}`);
    else log(`${req.method} ${path} ${status} ${err.message}`);
    if (!res.headersSent) sendJson(res, status, { error: status === 500 ? 'Something went wrong on the server.' : err.message });
  }
});

server.listen(config.port, '127.0.0.1', () => {
  log(`receipt-server listening on http://127.0.0.1:${config.port} (model ${config.model})`);
});
