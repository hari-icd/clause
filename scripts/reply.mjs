#!/usr/bin/env node
// reply.mjs — post Claude's answer into the Clause Assist message pane (marks read messages as done).
//   node scripts/reply.mjs "Fixed 2 of 3 — #3 needs a new component"
const PORT = process.env.PORT || 8787, text = process.argv.slice(2).join(" ").trim();
if (!text) { console.error('usage: reply.mjs "text"'); process.exit(1); }
const r = await fetch(`http://localhost:${PORT}/term/reply`, { method: "POST", headers: { "content-type": "application/json", "x-clause": "1" }, body: JSON.stringify({ text }) });
console.log(r.ok ? "replied" : "failed " + r.status);
