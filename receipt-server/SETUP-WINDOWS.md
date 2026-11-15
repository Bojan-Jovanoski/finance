# Receipt server — Windows setup guide

This guide takes a Windows PC from nothing to a working receipt scanner for the
finance app. Follow it top to bottom. All commands are for **PowerShell**
(Start menu → type "PowerShell" → open it). You do **not** need an admin window
unless a step says so.

What you end up with:

```
Phone (PWA) ──HTTPS──▶ Tailscale Funnel ──▶ receipt-server (localhost:8787) ──▶ Ollama + qwen3-vl (GPU)
```

- Only this PC runs Tailscale. **The phones need nothing installed**, because
  Funnel gives the PC a normal public HTTPS address.
- That address is public, but the server only answers requests that carry a
  valid sign-in from one of the emails in `ALLOWED_EMAILS`. Everyone else gets
  401/403 and never reaches the model.
- **Pictures are never stored.** The photo is shrunk on the phone, sent once,
  read in memory and dropped. Nothing is written to disk, logged or saved in
  Firebase. The log only records the result (amount, date, shop, category).

Tested hardware: AMD RX 6700 XT (12 GB VRAM), 16 GB RAM.

---

## 1. Prerequisites

1. **Windows 10 (21H2+) or Windows 11.** Check with `winver`.
2. **The latest AMD Adrenalin driver** from <https://www.amd.com/en/support>.
   It includes Vulkan, which Ollama uses to run on the 6700 XT. (AMD's ROCm
   doesn't support this card on Windows, so Vulkan is the way in.)
3. **winget** (comes with Windows 11; on Windows 10 install "App Installer"
   from the Microsoft Store). Check with `winget --version`.
4. Allow local scripts for your user (one time):

   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   ```

   Every script below is also shown with `-ExecutionPolicy Bypass`, so this is
   optional, but it makes things simpler.

## 2. Get the code

If Git isn't installed yet:

```powershell
winget install --id Git.Git --exact
```

Close and reopen PowerShell, then:

```powershell
cd $HOME
git clone https://github.com/Bojan-Jovanoski/finance.git
cd finance\receipt-server
```

Already cloned? Then just `cd` into the folder and run `git pull`.

## 3. Run the setup script

From the `receipt-server` folder:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
```

It does the following and is safe to run again at any time:

| Step | What it does |
|------|--------------|
| Tools | `winget` installs **Git**, **Node.js LTS**, **Ollama** and **Tailscale**, skipping any that are already installed |
| npm | `npm install` for the server (only dependency: `firebase-admin`) |
| `.env` | Copies `.env.example` to `.env` if it doesn't exist yet |
| Ollama | Sets `OLLAMA_VULKAN=1` (use the AMD GPU) and `OLLAMA_KEEP_ALIVE=30m` (keep the model loaded for 30 minutes), then restarts Ollama |
| Model | `ollama pull qwen3-vl:8b-instruct`, about 6 GB, downloaded only once |

If it stops with "installed but not on PATH yet", close PowerShell, open a
new one and run it again.

<details>
<summary>Doing the same steps by hand</summary>

```powershell
winget install --id OpenJS.NodeJS.LTS --exact
winget install --id Ollama.Ollama --exact
winget install --id Tailscale.Tailscale --exact
# reopen PowerShell
node -v; ollama -v; tailscale version

npm.cmd install --omit=dev
copy .env.example .env

setx OLLAMA_VULKAN 1
setx OLLAMA_KEEP_ALIVE 30m
# Quit Ollama from the tray icon (right-click → Quit) and start it again from the Start menu
ollama pull qwen3-vl:8b-instruct
```
</details>

## 4. Check the GPU is used

```powershell
ollama run qwen3-vl:8b-instruct "Say hi"
ollama ps
```

The `PROCESSOR` column must say **100% GPU**. If it says CPU, or a
CPU/GPU split, see [Troubleshooting](#11-troubleshooting).

Optional: try a receipt photo straight in Ollama (paste the path into the prompt):

```powershell
ollama run qwen3-vl:8b-instruct "What is the total on this receipt? C:\Users\you\Pictures\receipt.jpg"
```

## 5. Configure the server

Open `receipt-server\.env` in Notepad (`notepad .env`) and fill it in:

| Key | Value |
|-----|-------|
| `FIREBASE_PROJECT_ID` | Firebase Console → ⚙ Project settings → General → **Project ID**. The same as `VITE_FIREBASE_PROJECT_ID` in the app's `.env.local`. |
| `ALLOWED_EMAILS` | The Google emails allowed to scan, separated by commas. Use the same list as `VITE_ALLOWED_EMAILS`. **Must not be empty**, or the server refuses to start. |
| `ALLOWED_ORIGINS` | Websites allowed to call the server. The default (`https://bojan-jovanoski.github.io,http://localhost:5173`) covers the live app and local development. |
| `OLLAMA_URL` | Leave as `http://127.0.0.1:11434`. |
| `OLLAMA_MODEL` | Leave as `qwen3-vl:8b-instruct` (see [Changing the model](#changing-the-model)). |
| `PORT` | Leave as `8787`. |

No Firebase service-account key is needed. The server only checks sign-in
tokens, which needs nothing more than the project ID.

## 6. First run and smoke test

```powershell
npm.cmd start
```

You should see `receipt-server listening on http://127.0.0.1:8787`. In a
**second** PowerShell window:

```powershell
curl.exe http://localhost:8787/health
# → {"ok":true,"ollama":true,"model":"qwen3-vl:8b-instruct","modelInstalled":true}

curl.exe -X POST http://localhost:8787/scan
# → {"error":"Missing sign-in token."}   (good: strangers are rejected)
```

### Test a real receipt

You need a sign-in token (it's valid for 1 hour):

1. Open the finance app in a desktop browser (the live site or `npm run dev`)
   and sign in.
2. Press **F12** → **Console**, paste this and press Enter:

   ```js
   await new Promise(r => { const q = indexedDB.open('firebaseLocalStorageDb'); q.onsuccess = () => { const t = q.result.transaction('firebaseLocalStorage').objectStore('firebaseLocalStorage').getAll(); t.onsuccess = () => r(t.result.find(x => x.value?.stsTokenManager)?.value.stsTokenManager.accessToken); }; })
   ```

3. Copy the long string it prints (without the quotes).

Then, from `receipt-server`:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\test-scan.ps1 -Image C:\path\to\receipt.jpg -Token PASTE_TOKEN_HERE
```

It prints the amount, date, shop and category, plus how long it took.
**Try 10–20 of your real receipts** (supermarket, fuel, EVN bill, restaurant,
pharmacy) before relying on it. If a certain shop keeps landing in the wrong
category, add a hint for it in `buildPrompt()` in `server.js`.

Stop the server with **Ctrl+C** when you're done. Autostart takes over in step 9.

## 7. Tailscale Funnel (public HTTPS address)

1. Start Tailscale from the Start menu and sign in (any Google/Microsoft/GitHub
   account; this creates your free "tailnet"). Or run `tailscale up`.
2. Turn on Funnel for this PC:

   ```powershell
   tailscale funnel --bg 8787
   ```

   The first time, it prints a link to enable HTTPS certificates and Funnel in
   the Tailscale admin console. Open it, approve, and run the command again.
   `--bg` keeps Funnel on permanently, including after reboots.
3. Get your address:

   ```powershell
   tailscale funnel status
   # → https://<pc-name>.<tailnet>.ts.net (Funnel on)  |-- / proxy http://127.0.0.1:8787
   ```

4. Test it from your **phone's browser on mobile data** (Wi-Fi off):
   `https://<pc-name>.<tailnet>.ts.net/health` should show `{"ok":true,...}`.
   (The server must be running: either `npm.cmd start` or the step 9 task.)

The server listens only on `127.0.0.1`, so no Windows Firewall rule or router
port forwarding is needed. Funnel reaches it from inside the PC.

To switch Funnel off: `tailscale funnel --https=443 off`.

## 8. Connect the app

The app shows the **Add from picture** button only when it knows the server address.

- **Live site (GitHub Pages):** GitHub → the `finance` repo → **Settings** →
  **Secrets and variables** → **Actions** → **New repository secret**.
  Name it `VITE_RECEIPT_API_URL`, with your Funnel address as the value (e.g.
  `https://home-pc.tail1234.ts.net`, no trailing slash). Then redeploy:
  **Actions** → **Deploy to GitHub Pages** → **Run workflow**, or push any commit.
- **Local development:** add the same line to the app's `.env.local`:

  ```
  VITE_RECEIPT_API_URL=https://home-pc.tail1234.ts.net
  ```

On the phone, reopen the installed app (close it fully once so the PWA
updates). Under **New entry** there's now an **Add from picture** button.
It offers "Take photo" or picking from the gallery. After a few seconds the form
is filled in; check it and tap **Record expense**. Nothing is saved until you do.

## 9. Start automatically

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-autostart.ps1
```

This registers a Task Scheduler task, **Finance Receipt Server**, that runs
`scripts\start.ps1` at log on. That script starts Ollama if needed, then runs the
server and restarts it if it crashes. Output goes to `receipt-server\logs\server.log`.

Check it after a reboot:

```powershell
curl.exe http://localhost:8787/health
Get-Content .\logs\server.log -Tail 20
```

The task runs when **you log on**, so the PC must be on and logged in (the
screen can be locked). To also scan while you're logged out, open Task
Scheduler → the task → Properties → "Run whether user is logged on or not".

To remove it: `powershell -ExecutionPolicy Bypass -File scripts\uninstall-autostart.ps1`.

Also turn off sleep while plugged in (Settings → System → Power → Screen and
sleep → "Make my device sleep after" → Never), or scans fail while the PC sleeps.

## 10. Daily use and updating

- Nothing to do. While the PC is on, both phones can scan.
- **Update after a `git pull`:**

  ```powershell
  cd $HOME\finance
  git pull
  cd receipt-server
  npm.cmd install --omit=dev
  powershell -ExecutionPolicy Bypass -File scripts\restart.ps1
  ```

- **After editing `.env`:** run `scripts\restart.ps1` the same way.
- **Logs:** `receipt-server\logs\server.log` (each scan: who, how long, the result).
  Ollama's own log is at `%LOCALAPPDATA%\Ollama\server.log`.

### Changing the model

```powershell
ollama pull qwen2.5vl:7b
notepad .env          # set OLLAMA_MODEL=qwen2.5vl:7b
powershell -ExecutionPolicy Bypass -File scripts\restart.ps1
```

Options that fit in 12 GB of VRAM:

| Model | Size | Notes |
|-------|------|-------|
| `qwen3-vl:8b-instruct` | ~6 GB | Default. Best at reading text in pictures at this size. |
| `qwen2.5vl:7b` | ~6 GB | Older fallback if qwen3-vl misbehaves. |
| `qwen3-vl:8b-instruct-q8_0` | ~10 GB | Higher quality, a bit slower. Leaves little VRAM for games. |

Use the **instruct** versions. The "thinking" versions are much slower and no
more accurate for this job.

## 11. Troubleshooting

**`ollama ps` shows CPU instead of 100% GPU**
- Check `OLLAMA_VULKAN` is set: `[Environment]::GetEnvironmentVariable('OLLAMA_VULKAN','User')` should print `1`.
- Quit Ollama fully (tray icon → Quit) and start it again. It reads the variables only at startup.
- Update Ollama (`winget upgrade Ollama.Ollama`) and the AMD driver.
- Search `%LOCALAPPDATA%\Ollama\server.log` for `vulkan` / `inference compute`. It should list the RX 6700 XT.
- Something else is using the VRAM (a game, a second model)? Close it, or try `ollama stop <model>` on other models.

**Scans are slow**
- The first scan after 30 idle minutes loads the model (an extra 5–10 s). The
  app warms the model up as soon as you tap "Add from picture", so it's usually
  loaded by the time you've taken the photo.
- More than about 15 s every time means it's running on the CPU. See above.

**App says "Could not reach the receipt reader. Is the home PC on?"**
- Is the PC on, awake and logged in? Run `curl.exe http://localhost:8787/health` on it.
- Is Funnel on? Run `tailscale funnel status`.
- Does `https://<pc>.<tailnet>.ts.net/health` work from the phone's browser?
- Check `VITE_RECEIPT_API_URL` matches the Funnel address exactly (https, no trailing slash).

**401 "Invalid or expired sign-in token"**
- In `test-scan.ps1`: the token is more than an hour old. Copy a new one.
- From the app: `FIREBASE_PROJECT_ID` in `.env` is wrong.

**403 "This account is not allowed to scan receipts"**
- The signed-in email isn't in `ALLOWED_EMAILS` in `.env`. Fix it and restart.

**Browser console shows a CORS error**
- The app's address isn't in `ALLOWED_ORIGINS`. It must be exactly the origin
  (e.g. `https://bojan-jovanoski.github.io`, no `/finance` path, no trailing slash).

**Server won't start**
- Read `logs\server.log`. `[config] ...` lines say which `.env` value is missing.
- "Port in use": another copy is already running. Run `scripts\restart.ps1`.

**Wrong amount or category**
- Retake the photo flat, well lit, with the whole receipt in frame.
- For a shop that's always wrong, add a hint line in `buildPrompt()` in `server.js`, then restart.
- Try the Q8 model (see [Changing the model](#changing-the-model)).
