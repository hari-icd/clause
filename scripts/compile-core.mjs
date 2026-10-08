// compile-core.mjs — pure, dependency-free: (catalog, screen JSON) → SCREEN for the builder runtime, with agent-friendly errors.
// Used by scripts/compile.mjs; pure function, no fs.
// Must stay self-contained: the installer embeds String(esCompile).
export function esCompile(cat, screen, name, screenIdx) {
  const used = { comps: {}, vars: {}, styles: {}, fonts: {} };
  const errors = [], ids = new Set();
  const near = (s, list) => list.filter(k => k.includes(String(s).split("-")[0]) || String(s).includes(k.split("-")[0])).slice(0, 8);
  const tokenKey = n => cat.vars.spacing["spacing-" + n] || cat.vars.radius["radius-" + n] || cat.vars.colors[n];
  const addVar = (n, where, field) => {
    if (n == null) return;
    if (typeof n === "number") { return; }
    const k = tokenKey(n);
    if (!k) errors.push(where + "." + field + ': unknown token "' + n + '" — spacing: ' + Object.keys(cat.vars.spacing).map(x => x.replace("spacing-", "")).join(", ") + " | radius: " + Object.keys(cat.vars.radius).map(x => x.replace("radius-", "")).join(", ") + " | colors like: bg-primary, border-secondary, text-tertiary (see guide)");
    else used.vars[n] = k;
  };
  const addComp = (key, where) => {
    const c = cat.comps[key];
    if (!c) { errors.push(where + ': unknown component "' + key + '"' + (near(key, Object.keys(cat.comps)).length ? " — did you mean: " + near(key, Object.keys(cat.comps)).join(", ") : "")); return null; }
    used.comps[key] = c.lib ? { lib: true, setKey: c.setKey || null, key: c.key, def: c.def || null } : { id: c.id, set: c.set, def: c.def };
    return c;
  };
  const walk = (n, path) => {
    if (!n) return;
    const where = path + (n.i ? "#" + n.i : "");
    if (n.c || n.t === "text" || n.t === "box") { if (!n.i) errors.push(where + ': missing "i" (unique id)'); else if (ids.has(n.i)) errors.push(where + ': duplicate id "' + n.i + '"'); else ids.add(n.i); }
    for (const [k, v] of Object.entries(n)) if (typeof v === "string" && /#[0-9a-fA-F]{3,8}\b/.test(v)) errors.push(where + "." + k + ': raw hex "' + v + '" — use a color variable name');
    if (n.c) {
      const c = addComp(n.c, where);
      for (const v of Object.values(n.p || {})) if (typeof v === "string" && v.startsWith("@")) addComp(v.slice(1), where);
      if (c && n.p) for (const [k, v] of Object.entries(n.p)) {
        const def = c.props && c.props[k];
        if (def === undefined) errors.push(where + ': prop "' + k + '" not on "' + n.c + '" (has: ' + Object.keys(c.props || {}).join(", ") + ")");
        else if (Array.isArray(def) && !def.includes(String(v))) errors.push(where + ": " + k + "=" + v + " not in [" + def.join(", ") + "]");
      }
    }
    for (const op of n.ops || []) for (const sp of op.nodes || []) { if (sp.tint) addVar(sp.tint, where, "ops.tint"); if (sp.color) addVar(sp.color, where, "ops.color"); if (sp.style) { const k = cat.styles[sp.style]; if (!k) errors.push(where + ": ops.style unknown " + sp.style); else { used.styles[sp.style] = k; if (cat.fonts[sp.style]) used.fonts[sp.style] = cat.fonts[sp.style]; } } if (sp.swap) addComp(String(sp.swap).slice(1), where); if (sp.icon) addComp(String(sp.icon).slice(1), where); }
    for (const f of ["gap", "rowGap", "pad", "px", "py", "pt", "pb", "pl", "pr"]) { const v = n[f]; if (typeof v === "number" && !n.why) errors.push(where + "." + f + ': raw ' + v + ' needs a "why"'); else addVar(v, where, f); }
    if (typeof n.radius === "number" && !n.why) errors.push(where + '.radius: raw number needs a "why"'); else addVar(n.radius, where, "radius");
    for (const f of ["bg", "border", "borderB", "borderL", "borderT", "borderR", "color", "tint"]) if (!(f === "bg" && n[f] === "none")) addVar(n[f], where, f);
    if (n.abs && !n.why) errors.push(where + ': "abs" needs a "why"');
    if (n.t === "text") {
      if (!n.content && !(n.runs && n.runs.length)) errors.push(where + ": text without content");
      if (n.size && !n.why) errors.push(where + ': "size" override needs a "why" (off-token type)');
      const st = n.style || "Text md/Regular", key = cat.styles[st];
      if (!key) errors.push(where + ': unknown text style "' + st + '" — valid: ' + Object.keys(cat.styles).join(", "));
      else { used.styles[st] = key; if (cat.fonts[st]) used.fonts[st] = cat.fonts[st]; }
    }
    (n.children || []).forEach((ch, i) => walk(ch, where + "/" + (ch.t || ch.c) + "[" + i + "]"));
  };
  const trees = screen.screens ? screen.screens.map(s => s.tree) : [screen.tree];
  const names = screen.screens ? screen.screens.map(s => s.name) : ["Default"];
  const pick = screenIdx == null ? trees.map((t, i) => [names[i], t]) : [[names[screenIdx], trees[screenIdx]]];
  pick.forEach(([, t], i) => walk(t, "screen" + i + ":"));
  const base = tokenKey("bg-primary"); if (base) used.vars["bg-primary"] = base; // root frame default fill
  if (errors.length) throw new Error("screen JSON has " + errors.length + " problem(s):\n  " + errors.join("\n  "));
  return { PAGE_ID: cat.page, PINNED_PAGE: screen.page || null, SECTION: screen.section || null, TITLE: screen.title || name || "Screen", WIDTH: screen.width || 1440, HEIGHT: screen.height || 0, REPLACE: screen.replace || null, VARS: used.vars, STYLES: used.styles, FONTS: used.fonts, COMPS: used.comps, SCREENS: pick };
}
