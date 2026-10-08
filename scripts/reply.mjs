#!/usr/bin/env node
// reply.mjs — post Claude's answer into the Clause Assist message pane (marks read messages as done).
//   node scripts/reply.mjs "Fixed 2 of 3 — #3 needs a new component"
//   node scripts/reply.mjs --working "Plan sent, building now"   (interim reply: the pane keeps its working animation)
const PORT = process.env.PORT || 8787, argv = process.argv.slice(2), working = argv.includes("--working"), text = argv.filter(a => a !== "--working").join(" ").trim();
if (!text) { console.error('usage: reply.mjs "text"'); process.exit(1); }
const r = await fetch(`http://localhost:${PORT}/term/reply`, { method: "POST", headers: { "content-type": "application/json", "x-clause": "1" }, body: JSON.stringify({ text, working }) });
console.log(r.ok ? "replied" : "failed " + r.status);
