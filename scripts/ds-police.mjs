#!/usr/bin/env node
// ds-police.mjs — writes the Figma-side script for the /ds-police command (paste it into use_figma).
//   node scripts/ds-police.mjs <nodeId> <fileKey>                  audit only: foreign components, tokens, styles (returns a compact report)
//   node scripts/ds-police.mjs <nodeId> <fileKey> --fix "name1,name2"   same + red border on foreign components, token swap to Unify 2026 for the listed variable names
// Foreign = bound to variables outside the Unify 2026 collections (ds/variable-keys.json _collections). Components are judged by the variables inside them. Output: .clause/ds-police.js
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [nodeId, fileKey] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const fi = process.argv.indexOf("--fix"), fix = fi > -1, names = fix ? String(process.argv[fi + 1] || "").split(",").map((s) => s.trim()).filter(Boolean) : [];
if (!nodeId || !fileKey) { console.error("usage: ds-police.mjs <nodeId> <fileKey> [--fix \"var name,var name\"]"); process.exit(1); }
const vk = JSON.parse(readFileSync(resolve(root, "ds/variable-keys.json"), "utf8"));
const colls = Object.values(vk._collections || {});
const byName = {}; for (const g of ["colors", "spacing", "radius", "widths", "containers", "fonts"]) Object.assign(byName, vk[g] || {});
const map = Object.fromEntries(names.filter((n) => byName[n]).map((n) => [n, byName[n]]));
const missing = names.filter((n) => !byName[n]);
const code = `// ds-police: ${fix ? "fix" : "audit"} ${nodeId}
const FIX = ${fix}, FILE = ${JSON.stringify(fileKey)}, ROOT = ${JSON.stringify(nodeId)};
const COLLS = new Set(${JSON.stringify(colls)}), MAP = ${JSON.stringify(map)};
const pg = figma.root.children.find(p => p.name === "Page 1") || figma.currentPage; await figma.setCurrentPageAsync(pg);
figma.skipInvisibleInstanceChildren = false;
const sec = await figma.getNodeByIdAsync(ROOT);
const link = id => "https://www.figma.com/design/" + FILE + "/?node-id=" + id.replace(/:/g, "-");
const vc = new Map();
const info = async id => { if (vc.has(id)) return vc.get(id); const v = await figma.variables.getVariableByIdAsync(id); let r = null; if (v) { const c = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId); r = { name: v.name, ok: COLLS.has(c.key), coll: c.name }; } vc.set(id, r); return r; };
const idsOf = n => { const o = []; const bv = n.boundVariables || {}; for (const f of Object.keys(bv)) { if (f === "fills" || f === "strokes") continue; const a = bv[f]; (Array.isArray(a) ? a : [a]).forEach((q, i) => q && q.id && o.push([f, q.id, -1])); } for (const f of ["fills", "strokes"]) if (n[f] && n[f] !== figma.mixed) n[f].forEach((p, i) => { const b = p.boundVariables && p.boundVariables.color; if (b) o.push([f, b.id, i]); }); return o; };
const all = sec.findAll(() => true);
// 1) components: a library component whose own variables are (mostly) not Unify 2026 tokens comes from another library
const cls = new Map(), out = new Map(), mixed = new Map(), swapped = [];
const inInst = n => { let x = n.parent; while (x && x !== sec) { if (x.type === "INSTANCE") return true; x = x.parent; } return false; };
const marked = new Set();
for (const n of all) if (n.type === "INSTANCE") {
  let a = n.parent, skip = false; while (a && a !== sec) { if (marked.has(a.id)) { skip = true; break; } a = a.parent; } if (skip) continue;
  const m = await n.getMainComponentAsync(); if (!m || !m.remote) continue;
  if (!cls.has(m.key)) { let bad = 0, tot = 0; for (const q of [m, ...(m.findAll ? m.findAll(() => true) : [])]) for (const [f, id] of idsOf(q)) { tot++; const r = await info(id); if (r && !r.ok) bad++; } cls.set(m.key, { name: (m.parent && m.parent.type === "COMPONENT_SET" ? m.parent.name : m.name).slice(0, 40), bad, tot }); }
  const c = cls.get(m.key); if (!c.bad) continue;
  if (c.bad * 2 >= c.tot) { marked.add(n.id); const e = out.get(m.key) || { name: c.name, uses: 0, links: [] }; e.uses++; if (e.links.length < 3) e.links.push(link(n.id)); out.set(m.key, e);
    if (FIX) { n.strokes = [{ type: "SOLID", color: { r: 1, g: 0, b: 15 / 255 } }]; n.strokeWeight = 2; n.strokeAlign = "OUTSIDE"; } }
  else mixed.set(m.key, c.name + " (" + c.bad + " of " + c.tot + " tokens)");
}
// 2) tokens on nodes outside instances: swap to the Unify 2026 variable of the same name
const fv = new Map();
for (const n of all) { if (n.type === "INSTANCE" || inInst(n)) continue;
  for (const [f, id, i] of idsOf(n)) { const r = await info(id); if (!r || r.ok) continue; fv.set(r.name, (fv.get(r.name) || 0) + 1);
    if (FIX && MAP[r.name]) { const nv = await figma.variables.importVariableByKeyAsync(MAP[r.name]); try { if (i >= 0) { const arr = n[f].slice(); arr[i] = figma.variables.setBoundVariableForPaint(arr[i], "color", nv); n[f] = arr; } else n.setBoundVariable(f, nv); swapped.push(r.name); } catch (e) {} } } }
return { nodes: all.length, foreignComponents: [...out.values()], mixedTokens: [...mixed.values()], foreignVariables: [...fv].map(([k, v]) => k + " x" + v), swapped: swapped.length${missing.length ? ", noUnifyMatch: " + JSON.stringify(missing) : ""} };
`;
mkdirSync(resolve(root, ".clause"), { recursive: true });
writeFileSync(resolve(root, ".clause/ds-police.js"), code);
console.log(`.clause/ds-police.js written (${Math.round(code.length / 1024)} KB, ${colls.length} collections${fix ? ", fix on, " + Object.keys(map).length + " token swaps mapped" : ""}${missing.length ? ", no Unify match for: " + missing.join(" | ") : ""})`);
