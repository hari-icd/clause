// compile.mjs — screens/<name>.json → SCREEN object (screen tree + only the token/component/style keys it uses).
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { esCompile } from "./compile-core.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Compact catalog = everything the compiler needs.
export function loadCatalog() {
  const comps = JSON.parse(readFileSync(resolve(root, "ds/components.json"), "utf8"));
  const keys = JSON.parse(readFileSync(resolve(root, "ds/variable-keys.json"), "utf8"));
  const ts = JSON.parse(readFileSync(resolve(root, "ds/tokens/text-styles.json"), "utf8")).textStyles;
  const config = existsSync(resolve(root, "ds/config.md")) ? readFileSync(resolve(root, "ds/config.md"), "utf8") : "";
  const c = {};
  for (const x of [...comps.local, ...comps.library]) c[x.key] = x.lib
    ? { lib: 1, setKey: x.setKey || null, key: x.variantKey, def: x.default || null, props: x.props || {} }
    : { id: x.id, set: x.set, def: x.default, props: x.props || {} };
  const fonts = {}; for (const s of ts) if (keys.textStyles[s.name]) fonts[s.name] = [s.fontFamily, s.fontStyle];
  return {
    page: (config.match(/`(\d+:\d+)`[^\n]*\*\*test\*\*/) || [])[1] || null, // fallback only; the plugin builds on the user's current page
    vars: { spacing: keys.spacing, radius: keys.radius, colors: Object.assign({}, keys.colors, keys.colorAliases) },
    styles: keys.textStyles, fonts, comps: c,
  };
}
export function compile(arg, screenIdx = null) {
  const file = arg.endsWith(".json") ? resolve(arg) : resolve(root, "screens", `${arg}.json`);
  const screen = JSON.parse(readFileSync(file, "utf8"));
  return esCompile(loadCatalog(), screen, arg, screenIdx);
}

