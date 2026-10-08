#!/usr/bin/env node
// session-start.mjs — runs from the SessionStart hook. Makes every Claude session in this repo start in the same state:
// server up, plugin/catalog/inbox status known, and the exact first actions spelled out. stdout becomes Claude's context.
import { spawn } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, openSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = process.env.PORT || 8787, B = `http://localhost:${PORT}`;
const get = async p => { try { const r = await fetch(B + p, { signal: AbortSignal.timeout(1500) }); return await r.json(); } catch { return null; } };
const out = [];
const hasDs = ["ds/components.json", "ds/variable-keys.json"].every(f => existsSync(resolve(root, f)));

let status = await get("/status"), started = false;
if (!status) {
  mkdirSync(resolve(root, ".clause"), { recursive: true });
  const log = openSync(resolve(root, ".clause", "server.log"), "a");
  try { const c = spawn(process.execPath, [resolve(root, "scripts/serve.mjs")], { cwd: root, detached: true, stdio: ["ignore", log, log], env: process.env }); c.unref(); started = true; } catch {}
  for (let i = 0; i < 12 && !status; i++) { await new Promise(r => setTimeout(r, 400)); status = await get("/status"); }
}
const term = status ? await get("/inbox?peek=1") : null;
const unread = term ? term.count : 0;

out.push("## Clause session state");
out.push(`- server: ${status ? (started ? "started just now" : "already running") + ` on :${PORT}` : "NOT running — run `node scripts/serve.mjs` in the background and tell the user if it fails"}`);
out.push(`- Figma plugin: ${status && status.plugin ? "connected" : "not connected (user must open Clause Assist in Figma: ⌘⌥P)"}`);
out.push(`- design-system catalog (ds/): ${hasDs ? "present" : "MISSING → run /onboard"}`);
out.push(`- unread plugin messages: ${unread}`);
const rules = resolve(root, "ds/design-rules.md");
if (existsSync(rules)) { const t = readFileSync(rules, "utf8"); const m = t.match(/## Standing preferences[\s\S]*$/); out.push(`- standing preferences: ${m ? m[0].split("\n").filter(l => l.startsWith("- ")).length + " recorded (read ds/design-rules.md before building)" : "none yet"}`); }
out.push("");
out.push("## Do this now, before replying to the user (every session, no exceptions)");
if (!hasDs) out.push("1. Run the /onboard skill. Stop there.");
else {
  out.push("1. Arm the inbox listener: Monitor, command `cd \"" + root + "\" && node scripts/inbox.mjs --watch`, timeout_ms 1800000, description \"Clause Assist inbox\". Re-arm it every time it fires or expires.");
  if (unread) out.push(`2. ${unread} message(s) are already waiting — run \`npm run inbox\` and handle them with the /fix workflow before anything else.`);
  else out.push("2. Nothing waiting. Tell the user in one line that you are listening, then continue with what they asked.");
}
out.push("Session rules: see CLAUDE.md → Session protocol.");
console.log(out.join("\n"));
