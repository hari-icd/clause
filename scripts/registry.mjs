// registry.mjs — design-system registry = product list (ds/registry.json, tracked) + this machine's own additions
// (.clause/registry.local.json, gitignored). Users' extracts/registrations never touch tracked files, so updates cannot conflict.
// role: "maintainer" (writes shared files: ds/registry.json, ds/design-rules.md) or "user" (default; writes only .clause/ + untracked ds/files/<new>).
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
const rd = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
export function role(root) { try { return readFileSync(resolve(root, ".clause/role"), "utf8").trim() === "maintainer" ? "maintainer" : "user"; } catch { return "user"; } }
export function loadRegistry(root) {
  const base = rd(resolve(root, "ds/registry.json"), { systems: [] }), local = rd(resolve(root, ".clause/registry.local.json"), { systems: [] });
  const systems = base.systems.map(s => ({ ...s }));
  for (const l of local.systems || []) { const i = systems.findIndex(s => s.id === l.id); if (i < 0) systems.push({ ...l }); else systems[i] = { ...systems[i], ...l, files: [...new Set([...(systems[i].files || []), ...(l.files || [])])] }; }
  return { ...base, systems };
}
// persist one system entry: maintainer -> ds/registry.json, user -> .clause/registry.local.json
export function saveSystem(root, entry) {
  const maint = role(root) === "maintainer", p = resolve(root, maint ? "ds/registry.json" : ".clause/registry.local.json");
  if (!maint) mkdirSync(resolve(root, ".clause"), { recursive: true });
  const reg = rd(p, { systems: [] }); const i = reg.systems.findIndex(s => s.id === entry.id); if (i < 0) reg.systems.push(entry); else reg.systems[i] = entry;
  writeFileSync(p, JSON.stringify(reg, null, 2)); return p;
}
export const localRulesPath = root => resolve(root, ".clause/local-rules.md");
export const rulesTargetPath = root => role(root) === "maintainer" ? resolve(root, "ds/design-rules.md") : localRulesPath(root);
