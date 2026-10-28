// webpaste.mjs — "Copy to Figma" (Chrome extension) → Figma, without switching windows.
//
//   Chrome extension ──POST /capture/paste──▶ this module ──osascript──▶ Figma gets focus, ⌘V, focus goes back
//                                                  │
//                                                  └─ SSE {type:"webpaste"} ─▶ Clause Assist plugin
//                                                        before: deselect (the paste lands top-level)
//                                                        after : select + zoom to the layers that arrived
//
// The captured page is already on the clipboard (the extension puts it there), so nothing big travels
// through here: the request is just "paste now". Figma's own importer then builds the layers.
//
// Safety: pressing keys on the machine is the sensitive part, so
//   • /capture/paste only accepts requests with `x-clause: 1` that are not from a web page
//     (no Origin header = a local tool, or an Origin of chrome-extension://… = the extension);
//   • it does nothing until the Clause Assist plugin has switched it on (/capture/settings, plugin only);
//   • one paste at a time, at most one per 1.5 s.
import { execFile } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const SCRIPT = `
tell application "System Events"
  if not (exists application process "Figma") then error "Figma is not running"
  set prevProc to first application process whose frontmost is true
end tell
tell application "Figma" to activate
tell application "System Events"
  repeat 40 times
    if frontmost of application process "Figma" then exit repeat
    delay 0.05
  end repeat
  delay 0.2
  key code 53 -- Esc: leave any text box / panel that has the keyboard so ⌘V reaches the canvas
  delay 0.15
  keystroke "v" using command down
end tell
delay 0.9
tell application "System Events"
  try
    set frontmost of prevProc to true
  end try
end tell
`;

const hintFor = (msg) => {
  if (/not allowed to send keystrokes|1002/i.test(msg)) return "macOS blocked the keypress: System Settings → Privacy & Security → Accessibility → allow the app that runs the Clause server (Terminal, iTerm, Claude…), then try again.";
  if (/not running/i.test(msg)) return "Open Figma first.";
  if (/not authori[sz]ed|-1743/i.test(msg)) return "macOS asked to let this app control Figma / System Events: System Settings → Privacy & Security → Automation → allow it.";
  return msg.split("\n")[0].slice(0, 200);
};

const EXT_LIVE_MS = 90 * 1000; // the extension counts as "live" for this long after it last talked to us

export function createWebPaste({ broadcast, pluginCount, log = () => {}, runner = null, statsFile = null }) {
  const st = { enabled: false, busy: false, lastAt: 0, last: null, extAt: 0, startedAt: Date.now(), totals: { captures: 0, frames: 0, since: Date.now() } };
  // the counter survives server restarts: it is only reset on purpose
  if (statsFile) { try { const t = JSON.parse(readFileSync(statsFile, "utf8")); if (t && typeof t.captures === "number") st.totals = { captures: t.captures | 0, frames: t.frames | 0, since: t.since || Date.now() }; } catch {} }
  const saveTotals = () => { if (!statsFile) return; try { mkdirSync(dirname(statsFile), { recursive: true }); writeFileSync(statsFile, JSON.stringify(st.totals)); } catch {} };
  // one snapshot for everyone (the plugin pane, curl): what is connected and how many frames came across
  const snapshot = () => ({ enabled: st.enabled, busy: st.busy, plugin: pluginCount() > 0, extension: { seen: st.extAt > 0, live: st.extAt > 0 && Date.now() - st.extAt < EXT_LIVE_MS, at: st.extAt || null }, last: st.last, totals: st.totals, now: Date.now() });
  const emit = () => { try { broadcast({ type: "capture", status: snapshot() }); } catch {} };
  const seen = (req) => { const o = req.headers.origin; if (o && o.startsWith("chrome-extension://")) { st.extAt = Date.now(); } };
  const runPaste = runner || (() => new Promise((res, rej) => {
    if (process.platform !== "darwin") return rej(new Error("Auto-paste is macOS only for now"));
    execFile("osascript", ["-e", SCRIPT], { timeout: 15000 }, (err, _out, stderr) => err ? rej(new Error(String(stderr || err.message))) : res());
  }));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function paste() {
    st.busy = true; st.lastAt = Date.now(); emit();
    try {
      if (pluginCount() > 0) { broadcast({ type: "webpaste", phase: "before" }); await sleep(450); } // let the plugin deselect first
      await runPaste();
      broadcast({ type: "webpaste", phase: "after" });
      st.last = { ok: true, at: Date.now() };
      log("web capture pasted into Figma");
    } catch (e) {
      const hint = hintFor(String(e && e.message || e));
      st.last = { ok: false, at: Date.now(), error: hint };
      broadcast({ type: "webpaste", phase: "error", text: hint });
      log("web capture paste failed: " + hint);
    } finally { st.busy = false; emit(); }
  }

  const originOk = (req, allow) => { const o = req.headers.origin; return !o || allow(o); };

  // returns true when it handled the request
  return async function handle(req, res, p, { json, body }) {
    if (!p.startsWith("/capture/")) return false;
    if (p === "/capture/status" && req.method === "GET") { seen(req); json(res, 200, snapshot()); return true; }
    if (req.method !== "POST") { json(res, 405, { error: "POST" }); return true; }
    if (req.headers["x-clause"] !== "1") { json(res, 403, { error: "POST with header x-clause: 1" }); return true; }

    if (p === "/capture/settings") { // the plugin iframe only (its Origin is "null")
      if (!originOk(req, (o) => o === "null")) { json(res, 403, { error: "plugin only" }); return true; }
      try { const b = JSON.parse(await body(req) || "{}"); st.enabled = !!b.enabled; } catch {}
      emit(); json(res, 200, { ok: true, enabled: st.enabled }); return true;
    }
    if (p === "/capture/result") { // the plugin reports what landed
      if (!originOk(req, (o) => o === "null")) { json(res, 403, { error: "plugin only" }); return true; }
      try { const b = JSON.parse(await body(req) || "{}"); const n = Math.max(0, b.count | 0); st.last = Object.assign({}, st.last, { count: n, names: Array.isArray(b.names) ? b.names.slice(0, 20) : [] }); if (n) { st.totals.captures += 1; st.totals.frames += n; saveTotals(); } } catch {}
      emit(); json(res, 200, { ok: true }); return true;
    }
    if (p === "/capture/reset") { // the plugin only: start the counter again
      if (!originOk(req, (o) => o === "null")) { json(res, 403, { error: "plugin only" }); return true; }
      st.totals = { captures: 0, frames: 0, since: Date.now() }; saveTotals(); emit(); json(res, 200, { ok: true }); return true;
    }
    if (p === "/capture/ping") { // optional: the extension says hello (popup open, page load) so the pane can show it as connected
      if (!originOk(req, (o) => o.startsWith("chrome-extension://"))) { json(res, 403, { error: "extension only" }); return true; }
      const was = st.extAt > 0 && Date.now() - st.extAt < EXT_LIVE_MS; seen(req); if (!was) emit(); json(res, 200, Object.assign({ ok: true }, snapshot())); return true;
    }
    if (p === "/capture/paste") { // the Chrome extension (or a local tool)
      if (!originOk(req, (o) => o.startsWith("chrome-extension://"))) { json(res, 403, { error: "extension only" }); return true; }
      seen(req); emit();
      if (!st.enabled) { json(res, 409, { ok: false, reason: "off", hint: "Open Clause Assist in Figma and turn on “Paste web captures” (Settings)." }); return true; }
      if (st.busy || Date.now() - st.lastAt < 1500) { json(res, 200, { ok: true, skipped: "busy" }); return true; }
      paste(); // runs in the background: the extension must not wait for Figma
      json(res, 202, { ok: true, started: true }); return true;
    }
    json(res, 404, { error: "unknown capture route" }); return true;
  };
}
