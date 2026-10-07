// ES DS builder runtime. Runs inside Figma via the loader emitted by scripts/build.mjs.
// Locals provided by loader: figma, SCREEN. Do not edit generated copies in the Figma file — run build.mjs --install.
const { VARS, STYLES, FONTS, COMPS, PAGE_ID, TITLE, WIDTH, HEIGHT, REPLACE, SCREENS, POS } = SCREEN;
const page = await figma.getNodeByIdAsync(PAGE_ID); await figma.setCurrentPageAsync(page);
const C = (typeof CACHE !== "undefined" && CACHE) || {};
const vcache = C.v || (C.v = {}), scache = C.s || (C.s = {}), SETS = C.sets || (C.sets = {});
function V(name) { return vcache[name] || (vcache[name] = figma.variables.importVariableByKeyAsync(VARS[name])); }
function S(name) { return scache[name] || (scache[name] = figma.importStyleByKeyAsync(STYLES[name])); }
const FL = C.f || (C.f = {});
function lf(f) { const k = f.family + "|" + f.style; return FL[k] || (FL[k] = figma.loadFontAsync(f)); }
async function loadNodeFonts(t) { const fn = t.fontName; if (fn !== figma.mixed) { await lf(fn); return; } for (const seg of t.getStyledTextSegments(["fontName"])) await lf(seg.fontName); }
const created = [], warnings = [];
// ---- inspect mode: SCREEN.INSPECT = node id -> structure/spec JSON (used by scripts/inspect.mjs) ----
async function inspectNode(id) {
  const root = await figma.getNodeByIdAsync(id); if (!root) throw new Error("node not found " + id);
  const vn = {}; const varName = async (b) => { if (!b) return null; const a = Array.isArray(b) ? b[0] : b; if (!a || !a.id) return null; if (!(a.id in vn)) { try { vn[a.id] = (await figma.variables.getVariableByIdAsync(a.id)).name.split("/").pop(); } catch { vn[a.id] = null; } } return vn[a.id]; };
  let count = 0;
  async function walk(n, depth) {
    if (++count > 1500) return null;
    const o = { id: n.id, n: n.name, t: n.type, w: Math.round(n.width), h: Math.round(n.height) };
    if (n.visible === false) { o.hidden = true; return o; }
    const bv = n.boundVariables || {};
    if ("layoutMode" in n && n.layoutMode !== "NONE") { o.lm = n.layoutMode; o.g = n.itemSpacing; o.pad = [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft]; o.pa = n.primaryAxisAlignItems; o.ca = n.counterAxisAlignItems; if (n.layoutWrap === "WRAP") o.wrap = true; }
    if ("layoutSizingHorizontal" in n) { o.sh = n.layoutSizingHorizontal; o.sv = n.layoutSizingVertical; }
    if (n.type === "FRAME" || n.type === "RECTANGLE") { if (n.cornerRadius && n.cornerRadius !== figma.mixed) o.r = n.cornerRadius; const f = await varName(bv.fills && bv.fills); const fl = n.fills && n.fills !== figma.mixed && n.fills[0]; if (fl && fl.visible !== false) o.fill = f || (fl.type === "SOLID" ? "raw" : fl.type); const sk = n.strokes && n.strokes[0]; if (sk) { o.stroke = (await varName(bv.strokes && bv.strokes)) || "raw"; if (n.dashPattern && n.dashPattern.length) o.dash = true; o.sw = n.strokeTopWeight; } }
    if (n.type === "TEXT") { o.c = n.characters.slice(0, 120); try { const sid = n.textStyleId; if (sid && sid !== figma.mixed) o.style = (await figma.getStyleByIdAsync(sid)).name; } catch {} o.color = await varName(bv.fills && bv.fills); if (n.textTruncation === "ENDING") o.maxLines = n.maxLines; return o; }
    if (n.type === "INSTANCE") {
      const mc = await n.getMainComponentAsync(); const set = mc && mc.parent && mc.parent.type === "COMPONENT_SET" ? mc.parent : null;
      o.mc = mc && { id: mc.id, key: mc.key, name: mc.name, remote: mc.remote, setKey: set && set.key, setName: set && set.name, setId: set && set.id };
      o.props = {}; for (const [k, v] of Object.entries(n.componentProperties)) o.props[k.split("#")[0]] = v.value;
      o.texts = n.findAll(t => t.type === "TEXT" && vis(t, n)).slice(0, 12).map(t => t.characters.slice(0, 80));
      return o;
    }
    if (depth > 14 || !n.children) return o;
    o.k = []; for (const c of n.children) { const w = await walk(c, depth + 1); if (w) o.k.push(w); }
    return o;
  }
  return { inspect: await walk(root, 0), roots: [], created: 0, warnings: [], ms: 0 };
}
if (SCREEN.INSPECT) return await inspectNode(SCREEN.INSPECT);

await Promise.all([...Object.keys(VARS).map(V), ...Object.keys(STYLES).map(S)]);
const TM = {};
async function tm(k, p) { const t = Date.now(); try { return await p; } finally { TM[k] = (TM[k] || 0) + (Date.now() - t); } }

function parseVariant(s) { const o = {}; for (const kv of (s || "").split(",")) { const [k, v] = kv.split("="); if (k && v) o[k.trim()] = v.trim(); } return o; }
async function component(key, props) {
  const spec = COMPS[key];
  let node;
  if (spec.lib) {
    if (!spec.setKey) return SETS["k" + spec.key] || (SETS["k" + spec.key] = await figma.importComponentByKeyAsync(spec.key));
    node = SETS[spec.setKey] || (SETS[spec.setKey] = await figma.importComponentSetByKeyAsync(spec.setKey));
  } else {
    node = await figma.getNodeByIdAsync(spec.id);
    if (!node) throw new Error("component node missing: " + key + " " + spec.id);
  }
  if (node.type !== "COMPONENT_SET") return node;
  const want = Object.assign(parseVariant(spec.def), props || {});
  const defs = node.componentPropertyDefinitions;
  const axes = Object.keys(defs).filter(k => defs[k].type === "VARIANT");
  const match = node.children.find(ch => { const pv = parseVariant(ch.name); return axes.every(a => !(a in want) || pv[a] === String(want[a])); });
  if (!match) { const dv = parseVariant(spec.def); const off = axes.filter(a => props && a in props && String(props[a]) !== dv[a]); if (off.length) warnings.push("variant not matched for " + key + ": want " + JSON.stringify(Object.fromEntries(off.map(a => [a, props[a]]))) + " -> using default variant"); }
  return match || node.defaultVariant;
}
async function setBoolProps(inst, props) {
  if (!props) return;
  let defs; try { defs = inst.componentProperties; } catch { return; }
  const out = {};
  const norm = s => s.replace(/[^a-z0-9 ]/gi, "").trim().toLowerCase();
  for (const [k, v] of Object.entries(props)) {
    const full = Object.keys(defs).find(d => norm(d.split("#")[0]) === norm(k));
    if (!full) continue;
    if (defs[full].type === "BOOLEAN") out[full] = (v === true || v === "true");
    else if (defs[full].type === "TEXT") out[full] = String(v);
    else if (defs[full].type === "INSTANCE_SWAP" && typeof v === "string" && v.startsWith("@")) out[full] = (await component(v.slice(1))).id;
  }
  if (Object.keys(out).length) {
    try { inst.setProperties(out); } catch (e) { warnings.push("setProperties " + inst.name + ": " + e.message); }
    try { const now = inst.componentProperties; for (const [k, v] of Object.entries(out)) { const got = now[k] && now[k].value; if (now[k] && now[k].type !== "INSTANCE_SWAP" && got !== v) warnings.push("prop not applied " + inst.name + " " + k.split("#")[0] + ": wanted " + v + " got " + got); } } catch (e) {}
  }
}
async function tintNode(inst, name) {
  const v = await V(name);
  const paint = figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", v);
  const VEC = ["VECTOR", "BOOLEAN_OPERATION", "LINE", "ELLIPSE", "STAR", "POLYGON", "RECTANGLE"];
  for (const k of inst.findAll(x => VEC.includes(x.type))) {
    if (k.strokes && k.strokes.some(s => s.visible !== false && s.type === "SOLID")) k.strokes = [paint];
    if (k.fills && k.fills !== figma.mixed && k.fills.some(s => s.visible !== false && s.type === "SOLID")) k.fills = [paint];
  }
}
function inInst(inst, id) { return inst.findOne(n => n.id === id || n.id.endsWith(";" + id)); }
async function applyOps(inst, ops) {
  for (const op of ops || []) {
    for (const sp of op.nodes || []) {
      let hit;
      if (sp.has) { const tx = inst.findAll(n => n.type === "TEXT" && n.characters.includes(sp.has))[sp.nth || 0]; if (tx) { hit = tx; let up = tx.parent; while (up && up !== inst) { if (up.type === "INSTANCE" && (!sp.name || up.name === sp.name)) { hit = up; break; } up = up.parent; } } }
      else hit = inst.findAll(n => n.name === sp.name)[sp.nth || 0];
      if (!hit) { warnings.push("nodes: no #" + (sp.nth || 0) + " " + (sp.name || ("has:" + sp.has))); continue; }
      if (sp.hide) hit.visible = false; if (sp.show) hit.visible = true;
      if (sp.swap) { const comp = await component(sp.swap.slice(1)); try { hit.swapComponent(comp); } catch (e) { warnings.push("nodes swap " + sp.name + ": " + e.message); } }
      if (sp.props) { const tgt = hit.type === "INSTANCE" ? hit : hit.findOne(n => n.type === "INSTANCE"); try { tgt.setProperties(sp.props); } catch (e) { warnings.push("nodes props " + sp.name + ": " + e.message); } }
      if (sp.maxLines) { const t = hit.type === "TEXT" ? hit : hit.findOne(n => n.type === "TEXT"); if (t) { t.textAutoResize = "HEIGHT"; try { if (t.parent.layoutMode) t.parent.layoutSizingHorizontal = "FILL"; t.layoutSizingHorizontal = "FILL"; } catch (e) { warnings.push("maxLines fill: " + e.message); } t.textTruncation = "ENDING"; t.maxLines = sp.maxLines; } }
      if (sp.style || sp.color) { const t = hit.type === "TEXT" ? hit : hit.findOne(n => n.type === "TEXT"); if (!t) warnings.push("nodes: no text in " + sp.name); else {
        if (sp.style) { const font = FONTS[sp.style]; if (font) for (const st of [font[1], font[1].replace(/([a-z])([A-Z])/g, "$1 $2"), "Regular"]) { try { await lf({ family: font[0], style: st }); break; } catch {} } try { await t.setTextStyleIdAsync((await S(sp.style)).id); } catch (e) { warnings.push("nodes style " + sp.style + ": " + e.message); } }
        if (sp.color) await bindFill(t, sp.color, "fill"); } }
      if (sp.align) { const t = hit.type === "TEXT" ? hit : hit.findOne(n => n.type === "TEXT"); if (t) { await loadNodeFonts(t); t.textAlignHorizontal = String(sp.align).toUpperCase(); try { if (t.parent && t.parent.layoutMode) { t.parent.layoutSizingHorizontal = "FILL"; t.parent.primaryAxisAlignItems = sp.align === "right" ? "MAX" : sp.align === "center" ? "CENTER" : "MIN"; } t.layoutSizingHorizontal = "FILL"; } catch (e) {} } }
      if (sp.tint) await tintNode(hit, sp.tint);
      if (sp.icon) { const ic = hit.findOne(n => n.type === "INSTANCE"); const comp = await component(sp.icon.slice(1)); if (ic) ic.swapComponent(comp); else warnings.push("nodes: no icon inside " + sp.name); }
    }
    for (const nm of op.hideNames || []) for (const t of inst.findAll(n => n.name === nm)) t.visible = false;
    for (const id of op.hide || []) { const t = inInst(inst, id); if (t) t.visible = false; else warnings.push("hide: not found " + id); }
    if (op.icons) {
      const mains = {};
      for (const [, src] of op.icons) { const c = inInst(inst, src); const ic = c && c.findOne(n => n.type === "INSTANCE"); mains[src] = ic ? await ic.getMainComponentAsync() : null; }
      for (const [tgt, src] of op.icons) { const c = inInst(inst, tgt); const ic = c && c.findOne(n => n.type === "INSTANCE"); if (ic && mains[src]) ic.swapComponent(mains[src]); else warnings.push("icons: " + tgt + " <- " + src); }
    }
    for (const [id, props] of op.set || []) { const t = inInst(inst, id); try { t.setProperties(props); } catch (e) { warnings.push("set " + id + ": " + e.message); } }
  }
}
function vis(n, root) { for (let p = n; p && p !== root.parent; p = p.parent) if (p.visible === false) return false; return true; }
async function setTexts(inst, text) {
  if (!text) return;
  const nodes = inst.findAllWithCriteria({ types: ["TEXT"] }).filter(t => vis(t, inst));
  if (Array.isArray(text)) {
    for (let i = 0; i < text.length && i < nodes.length; i++) { if (text[i] == null) continue; await loadNodeFonts(nodes[i]); nodes[i].characters = String(text[i]); }
  } else {
    for (const [needle, val] of Object.entries(text)) {
      const t = nodes.find(n => n.characters.includes(needle));
      if (!t) { warnings.push("text not found in " + inst.name + ": " + needle); continue; }
      await loadNodeFonts(t); t.characters = String(val);
    }
  }
}
async function bindFill(node, name, kind) {
  const v = await V(name);
  const paint = figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", v);
  if (kind === "stroke") { node.strokes = [paint]; node.strokeWeight = 1; node.strokeAlign = "INSIDE"; } else node.fills = [paint];
}
async function bindNum(node, field, name) {
  if (name == null) return;
  if (typeof name === "number") { node[field] = name; return; }
  node.setBoundVariable(field, await V(name));
}
async function applyBox(f, n) {
  f.name = n.i || n.t;
  f.layoutMode = (n.t === "row" || n.dir === "row") ? "HORIZONTAL" : "VERTICAL";
  f.primaryAxisSizingMode = "AUTO"; f.counterAxisSizingMode = "AUTO";
  f.fills = []; f.clipsContent = !!n.clip;
  await bindNum(f, "itemSpacing", n.gap);
  if (n.wrap) { f.layoutWrap = "WRAP"; await bindNum(f, "counterAxisSpacing", n.rowGap); }
  const pad = { pt: n.pt ?? n.py ?? n.pad, pb: n.pb ?? n.py ?? n.pad, pl: n.pl ?? n.px ?? n.pad, pr: n.pr ?? n.px ?? n.pad };
  await bindNum(f, "paddingTop", pad.pt); await bindNum(f, "paddingBottom", pad.pb); await bindNum(f, "paddingLeft", pad.pl); await bindNum(f, "paddingRight", pad.pr);
  if (n.radius != null) for (const c of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) await bindNum(f, c, n.radius);
  if (n.bg && n.bg !== "none") await bindFill(f, n.bg, "fill");
  if (n.border) await bindFill(f, n.border, "stroke");
  if (n.borderB) { await bindFill(f, n.borderB, "stroke"); f.strokeTopWeight = 0; f.strokeLeftWeight = 0; f.strokeRightWeight = 0; f.strokeBottomWeight = 1; }
  if (n.borderT) { await bindFill(f, n.borderT, "stroke"); f.strokeLeftWeight = 0; f.strokeBottomWeight = 0; f.strokeRightWeight = 0; f.strokeTopWeight = 1; }
  if (n.borderR) { await bindFill(f, n.borderR, "stroke"); f.strokeLeftWeight = 0; f.strokeBottomWeight = 0; f.strokeTopWeight = 0; f.strokeRightWeight = 1; }
  if (n.opacity != null) f.opacity = n.opacity;
  if (n.bgBlur) f.effects = [{ type: "BACKGROUND_BLUR", radius: n.bgBlur, visible: true }];
  if (n.borderL) { await bindFill(f, n.borderL, "stroke"); f.strokeTopWeight = 0; f.strokeBottomWeight = 0; f.strokeRightWeight = 0; f.strokeLeftWeight = 1; }
  if (n.dash) f.dashPattern = [4, 4];
  const A = { start: "MIN", center: "CENTER", end: "MAX", between: "SPACE_BETWEEN" };
  if (n.justify) f.primaryAxisAlignItems = A[n.justify] || "MIN";
  if (n.align) f.counterAxisAlignItems = A[n.align] === "SPACE_BETWEEN" ? "MIN" : (A[n.align] || "MIN");
}
function size(node, n, parent) {
  // after append: FILL/HUG legal. w/h fixed; fill:"x"|"y"|"both"; grow = fill along parent's main axis
  if (n.bg === "none" && "fills" in node) node.fills = [];
  if (n.w != null || n.h != null) {
    const uniform = node.type === "INSTANCE" && n.w && n.h && Math.abs(n.w / n.h - node.width / node.height) < 0.02;
    let done = false;
    if (uniform) { try { node.rescale(n.w / node.width); done = true; } catch (e) {} }
    if (!done) node.resize(n.w ?? node.width, n.h ?? node.height);
  }
  const horiz = parent && parent.layoutMode === "HORIZONTAL";
  const fx = n.fill === "x" || n.fill === "both" || (n.grow && horiz);
  const fy = n.fill === "y" || n.fill === "both" || (n.grow && !horiz);
  if (fx) { if (node.type !== "TEXT") node.resize(100, node.height); node.layoutSizingHorizontal = "FILL"; } else if (n.w == null && node.type === "FRAME" && node.layoutMode) node.layoutSizingHorizontal = "HUG";
  if (fy) node.layoutSizingVertical = "FILL"; else if (n.h == null && node.type === "FRAME" && node.layoutMode) node.layoutSizingVertical = "HUG";
}
async function build(n, parent) {
  let node;
  if (n.c) {
    const comp = await tm("component", component(n.c, n.p));
    node = comp.createInstance(); node.name = n.i || comp.name;
    parent.appendChild(node);
    await tm("props", setBoolProps(node, n.p));
    await tm("ops", applyOps(node, n.ops));
    await tm("texts", setTexts(node, n.text));
    if (n.tint) await tintNode(node, n.tint);
  } else if (n.t === "text") {
    node = figma.createText(); node.name = n.i || "text";
    const st = n.style || "Text md/Regular";
    const font = FONTS[st];
    let loaded = null;
    if (font) for (const style of [font[1], font[1].replace(/([a-z])([A-Z])/g, "$1 $2"), "Regular"]) {
      try { await lf({ family: font[0], style }); loaded = { family: font[0], style }; break; } catch {}
    }
    if (!loaded) { await figma.loadFontAsync({ family: "Inter", style: "Regular" }); loaded = { family: "Inter", style: "Regular" }; warnings.push("font fallback for " + st); }
    node.fontName = loaded;
    parent.appendChild(node);
    const runs = n.runs || null;
    node.characters = runs ? runs.map(x => x.x).join("") : String(n.content);
    try { await node.setTextStyleIdAsync((await S(st)).id); } catch (e) { warnings.push("style " + st + ": " + e.message); }
    if (n.size) { node.fontSize = n.size; if (n.lh) node.lineHeight = { unit: "PIXELS", value: n.lh }; }
    if (runs) {
      const fam = (font && font[0]) || "Geist"; let pos = 0;
      for (const run of runs) {
        const a = pos, b = pos + run.x.length; pos = b;
        if (!run.b && !run.i && !run.code) continue;
        const cands = run.code ? [["JetBrains Mono", "Regular"]] : run.i ? [[fam, "Italic"], [fam, "Light Italic"]] : [[fam, "SemiBold"], [fam, "Semi Bold"], [fam, "Bold"]];
        let ok = false;
        for (const [ff, fs] of cands) { try { await lf({ family: ff, style: fs }); node.setRangeFontName(a, b, { family: ff, style: fs }); ok = true; break; } catch {} }
        if (run.code && typeof node.fontSize === "number") node.setRangeFontSize(a, b, Math.round(node.fontSize * 0.86));
        if (!ok) warnings.push("run font unavailable: " + JSON.stringify(cands[0]));
      }
    }
    if (n.color) await bindFill(node, n.color, "fill");
    if (n.w != null) { node.textAutoResize = "HEIGHT"; node.resize(n.w, node.height); }
    else if (n.fill === "x" || n.grow) { node.textAutoResize = "HEIGHT"; }
    if (n.align === "center") node.textAlignHorizontal = "CENTER";
    if (n.maxLines) { node.textTruncation = "ENDING"; node.maxLines = n.maxLines; }
  } else if (n.t === "spacer") {
    node = figma.createFrame(); node.name = "spacer"; node.fills = []; node.resize(100, 1); parent.appendChild(node);
    node.layoutSizingHorizontal = parent.layoutMode === "HORIZONTAL" ? "FILL" : "FIXED";
    node.layoutSizingVertical = parent.layoutMode === "VERTICAL" ? "FILL" : "FIXED";
    created.push(node.id); return node;
  } else {
    node = figma.createFrame(); await tm("box", applyBox(node, n)); parent.appendChild(node);
    for (const ch of (n.children || [])) await build(ch, node);
  }
  size(node, n, parent);
  if (n.abs) { node.layoutPositioning = "ABSOLUTE"; node.x = n.abs.x; node.y = n.abs.y; }
  if (n.hidden) node.visible = false;
  created.push(node.id);
  return node;
}
// place root frames to the right of existing content
const T_START = Date.now();
let x = 0, replaced = false;
const wanted = new Set(SCREENS.map(([nm]) => TITLE + (SCREENS.length > 1 ? " — " + nm : "")));
const stale = page.children.filter(n => n.type === "FRAME" && wanted.has(n.name));
if (stale.length) { x = Math.min(...stale.map(n => n.x)); replaced = true; for (const n of stale) n.remove(); }
if (REPLACE) { const old = await figma.getNodeByIdAsync(REPLACE); if (old) { x = old.x; old.remove(); replaced = true; } }
if (POS) { x = POS.x; replaced = true; }
if (!replaced) for (const ch of page.children) x = Math.max(x, ch.x + ch.width + 200);
const roots = [], rootNodes = [];
for (const [name, tree] of SCREENS) {
  const rootF = figma.createFrame(); rootF.name = TITLE + (SCREENS.length > 1 ? " — " + name : "");
  page.appendChild(rootF); rootF.x = x; rootF.y = POS ? POS.y : 0;
  await applyBox(rootF, Object.assign({ t: "stack" }, tree, { i: rootF.name }));
  rootF.resize(WIDTH, HEIGHT || 900);
  rootF.primaryAxisSizingMode = HEIGHT ? "FIXED" : "AUTO"; rootF.counterAxisSizingMode = "FIXED";
  if (!tree.bg && VARS["bg-primary"]) await bindFill(rootF, "bg-primary", "fill");
  for (const ch of (tree.children || [])) await build(ch, rootF);
  roots.push(rootF.id); rootNodes.push(rootF); x += WIDTH + 200;
}
figma.viewport.scrollAndZoomIntoView(rootNodes);
if (typeof rootNodes[0].screenshot === "function") { try { await rootNodes[0].screenshot({ scale: 1 }); } catch (e) { warnings.push("screenshot: " + e.message); } }
return { roots, created: created.length, warnings, removedDuplicates: stale.length, timing: Object.assign({ totalMs: Date.now() - T_START }, TM) };
