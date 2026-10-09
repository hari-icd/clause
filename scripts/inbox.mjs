#!/usr/bin/env node
// inbox.mjs — Claude (or any agent) pulls the messages the user sent from the Clause Assist message pane.
//   node scripts/inbox.mjs            print unread sent messages once (marks them read)
//   node scripts/inbox.mjs --peek     print without marking read
//   node scripts/inbox.mjs --watch    block until something arrives (for a Monitor), then print it
const PORT = process.env.PORT || 8787, peek = process.argv.includes("--peek"), watch = process.argv.includes("--watch");
const get = async () => (await fetch(`http://localhost:${PORT}/inbox${peek ? "?peek=1" : ""}`)).json();
let r = await get();
while (watch && !r.count) { await new Promise(s => setTimeout(s, 1500)); r = await get(); }
if (!r.count) { console.log("(inbox empty)"); process.exit(0); }
try { const a = await (await fetch(`http://localhost:${PORT}/ds/active`)).json(); console.log(`context: Figma file "${a.file || "unknown"}" · design system ${a.system ? a.system.name + " (catalog " + a.system.dir + ", " + a.source + ")" : "UNKNOWN — ask the user which one, or run Extract"}\n`); } catch {}
for (const m of r.messages) console.log(`--- ${m.kind === "batch" ? "annotations" : m.kind === "system" ? "SYSTEM EVENT" : "message"} ${m.id}${m.title ? " · " + m.title : ""}\n${m.text}\n`);
console.log("(when done: npm run reply -- \"what you changed\")");
