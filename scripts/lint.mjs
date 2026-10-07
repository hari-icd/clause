#!/usr/bin/env node
// lint.mjs — hard-fail gate for screens/<name>.json
// Checks: unknown component key, bad prop value, raw hex / raw px without "why", duplicate or missing ids.
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = process.argv[2];
if (!arg) { console.error("usage: lint.mjs <screen-name|path>"); process.exit(2); }
const file = arg.endsWith(".json") ? resolve(arg) : resolve(root, "screens", `${arg}.json`);

const comps = JSON.parse(readFileSync(resolve(root, "ds/components.json"), "utf8"));
const vars = JSON.parse(readFileSync(resolve(root, "ds/variable-keys.json"), "utf8"));
const byKey = new Map([...comps.local, ...comps.library].map(c => [c.key, c]));
const spacing = new Set(Object.keys(vars.spacing).map(k => k.replace(/^spacing-/, "")));
const radius = new Set(Object.keys(vars.radius).map(k => k.replace(/^radius-/, "")));
const colors = new Set(Object.keys(vars.colorAliases));

const errors = [];
const ids = new Map();
const screen = JSON.parse(readFileSync(file, "utf8"));
const trees = screen.screens ? screen.screens.map(s => s.tree) : [screen.tree];
if (!trees.length || trees.some(t => !t)) errors.push("no tree / screens[].tree");

const HEX = /#[0-9a-fA-F]{3,8}\b/;
function walk(n, path) {
  if (!n || typeof n !== "object") return;
  const where = `${path}${n.i ? `#${n.i}` : ""}`;
  // ids
  if (n.c || n.t === "text" || n.t === "box") {
    if (!n.i) errors.push(`${where}: missing "i"`);
    else if (ids.has(n.i)) errors.push(`${where}: duplicate id "${n.i}" (also ${ids.get(n.i)})`);
    else ids.set(n.i, where);
  }
  // raw hex anywhere
  for (const [k, v] of Object.entries(n)) if (typeof v === "string" && HEX.test(v)) errors.push(`${where}.${k}: raw hex "${v}"`);
  // component
  if (n.c) {
    const c = byKey.get(n.c);
    if (!c) errors.push(`${where}: unknown component key "${n.c}"`);
    else if (n.p) for (const [k, v] of Object.entries(n.p)) {
      const def = c.props?.[k];
      if (def === undefined) errors.push(`${where}: prop "${k}" not on "${n.c}" (has: ${Object.keys(c.props || {}).join(", ") || "none"})`);
      else if (Array.isArray(def) && !def.includes(String(v))) errors.push(`${where}: "${k}=${v}" not in [${def.join(", ")}]`);
      else if (def === "BOOLEAN" && !["true", "false", true, false].includes(v)) errors.push(`${where}: "${k}" expects boolean`);
    }
  }
  // tokens on layout fields
  const tok = (field, set, label) => {
    const v = n[field];
    if (v === undefined) return;
    if (typeof v === "number") { if (!n.why) errors.push(`${where}.${field}: raw ${v} without "why"`); return; }
    if (!set.has(String(v))) errors.push(`${where}.${field}: "${v}" not a ${label} token`);
  };
  for (const f of ["gap", "rowGap", "pad", "px", "py", "pt", "pb", "pl", "pr", "m", "mx", "my", "mt", "mb", "ml", "mr"]) tok(f, spacing, "spacing");
  tok("radius", radius, "radius");
  for (const f of ["bg", "border", "borderB", "borderL", "borderT", "borderR", "color", "tint"]) if (n[f] !== undefined && !colors.has(n[f]) && !(f === "bg" && n[f] === "none")) errors.push(`${where}.${f}: "${n[f]}" not a color variable`);
  if (n.abs && !n.why) errors.push(`${where}: "abs" positioning needs a "why"`);
  // text primitive
  if (n.t === "text" && !n.content && !(n.runs && n.runs.length)) errors.push(`${where}: text without content`);
  if (typeof n.content === "string" && /lorem|ipsum|placeholder text/i.test(n.content)) errors.push(`${where}: placeholder copy`);
  // spacing shim: sized empty box
  if (n.t === "box" && !n.children?.length && (n.w || n.h) && !n.bg && !n.border) errors.push(`${where}: spacing shim (empty sized box) — use gap/pad`);
  (n.children || []).forEach((ch, i) => walk(ch, `${where}/${ch.t || ch.c}[${i}]`));
}
trees.forEach((t, i) => walk(t, `screen${i}:`));

if (errors.length) { console.error(`✗ ${file}\n  ` + errors.join("\n  ")); process.exit(1); }
console.log(`✓ ${file} clean (${ids.size} ids)`);
