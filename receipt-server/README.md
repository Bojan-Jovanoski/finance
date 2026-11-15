# receipt-server

A small Node server that reads receipt, invoice and slip photos with a **local
vision model** (Ollama) and suggests an expense entry for the finance app:
the total, date, shop and category.

It runs on the home PC and is reached from the phones through Tailscale Funnel.
**Setting it up on Windows: see [SETUP-WINDOWS.md](SETUP-WINDOWS.md).**

```
Phone (PWA) ──HTTPS + Firebase ID token──▶ Tailscale Funnel ──▶ server.js (127.0.0.1:8787) ──▶ Ollama (127.0.0.1:11434)
```

## How it works

1. In the app, **Add from picture** shrinks the photo to at most 1600 px and
   sends it with the household's category list and the user's Firebase ID token.
2. The server verifies the token (`firebase-admin`, project ID only) and checks
   the email against `ALLOWED_EMAILS`.
3. It sends the image to Ollama with a prompt tuned for Macedonian receipts and
   a JSON schema whose `category` is limited to your category names, so the
   model can't invent one.
4. It returns `{ amount, date, merchant, categoryId }`. The app fills in the
   form; the user checks it and taps Record.

Scans run one at a time, because the GPU handles one image at a time.

**Privacy:** images exist only in memory during the request. They are never
written to disk, logged or stored in Firebase. The log records only the user,
how long the scan took and the extracted fields.

## API

All responses are JSON. Errors look like `{ "error": "message" }`.

| Route | Auth | Description |
|-------|------|-------------|
| `GET /health` | none | `200 { ok, ollama, model, modelInstalled }`, or `503` if Ollama or the model is missing |
| `POST /warm` | Bearer token | Starts loading the model into VRAM (the app calls this when the photo picker opens). `202` |
| `POST /scan` | Bearer token | Body `{ image: <base64 JPEG>, categories: [{ id, name }] }` → `{ amount, date, merchant, categoryId }`. Any field may be `null` if the model couldn't read it |

Status codes: `400` bad body, `401` missing or invalid token, `403` email not
allowed, `413` image over 6 MB, `502` Ollama not running or a bad answer from
the model, `504` the model took over 90 s.

## Configuration (`.env`)

| Key | Default | Meaning |
|-----|---------|---------|
| `FIREBASE_PROJECT_ID` | (required) | Used to verify sign-in tokens |
| `ALLOWED_EMAILS` | (required) | Comma-separated Google emails allowed to scan |
| `ALLOWED_ORIGINS` | none | Comma-separated browser origins allowed by CORS |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama address |
| `OLLAMA_MODEL` | `qwen3-vl:8b-instruct` | Vision model |
| `PORT` | `8787` | Listens on 127.0.0.1 only |

## Files

| Path | Purpose |
|------|---------|
| `server.js` | The whole server: auth, prompt, Ollama call, routes |
| `scripts/setup.ps1` | One-time Windows setup: tools, npm, Ollama settings, model, `.env` |
| `scripts/start.ps1` | Starts Ollama and the server with automatic restarts, logging to `logs/server.log` |
| `scripts/install-autostart.ps1` | Registers the "Finance Receipt Server" logon task |
| `scripts/uninstall-autostart.ps1` | Removes the task and stops the server |
| `scripts/restart.ps1` | Restarts the task after `git pull` or `.env` changes |
| `scripts/test-scan.ps1` | Sends one photo and prints the result |
| `scripts/common.ps1` | Helpers shared by the scripts |

## Running on macOS or Linux (development)

```bash
cd receipt-server
npm install
cp .env.example .env   # fill in
ollama pull qwen3-vl:8b-instruct
npm start
```
