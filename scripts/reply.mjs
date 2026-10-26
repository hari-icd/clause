#!/usr/bin/env node
// reply.mjs — post Claude's answer into the Clause Assist message pane (marks read messages as done).
//   node scripts/reply.mjs "Fixed 2 of 3 — #3 needs a new component"
//   node scripts/reply.mjs --working "Plan sent, building now"   (interim reply: the pane keeps its working animation)
const PORT = process.env.PORT || 8787, argv = process.argv.slice(2), working = argv.includes("--working");
// --ask [--option "Label" ...] (up to 4): shows a raised-hand "needs your input" card with tap-to-answer options
// --pill "Label=<nodeId>" (repeatable): clickable chips under the reply that jump to the frame
const targets = []; const rest = []; const options = []; const ask = argv.includes("--ask");
for (let i = 0; i < argv.length; i++) { if (argv[i] === "--pill" && argv[i + 1]) { const [name, ...id] = argv[++i].split("="); targets.push({ name, id: id.join("=").replace("-", ":") }); } else if (argv[i] === "--option" && argv[i + 1]) options.push(argv[++i]); else if (argv[i] !== "--working" && argv[i] !== "--ask") rest.push(argv[i]); }
const text = rest.join(" ").trim();
if (!text) { console.error('usage: reply.mjs "text"'); process.exit(1); }
const r = await fetch(`http://localhost:${PORT}/term/reply`, { method: "POST", headers: { "content-type": "application/json", "x-clause": "1" }, body: JSON.stringify({ text, working, targets, ask: ask ? { options } : undefined }) });
console.log(r.ok ? "replied" : "failed " + r.status);
