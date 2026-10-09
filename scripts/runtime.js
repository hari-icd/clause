// ES DS builder runtime. Runs inside Figma via the loader emitted by scripts/build.mjs.
// Locals provided by loader: figma, SCREEN. Do not edit generated copies in the Figma file — run build.mjs --install.
const { VARS, STYLES, FONTS, COMPS, PAGE_ID, TITLE, WIDTH, HEIGHT, REPLACE, SCREENS, POS } = SCREEN;
const page = SCREEN.INSPECT || SCREEN.SNAP || SCREEN.PAGES ? figma.currentPage : await figma.getNodeByIdAsync(PAGE_ID); if (page.id !== figma.currentPage.id) await page.loadAsync(); // never switch the user's page
const C = (typeof CACHE !== "undefined" && CACHE) || {};
const vcache = C.v || (C.v = {}), scache = C.s || (C.s = {}), SETS = C.sets || (C.sets = {});
function V(name) { return vcache[name] || (vcache[name] = figma.variables.importVariableByKeyAsync(VARS[name])); }
function S(name) { return scache[name] || (scache[name] = figma.importStyleByKeyAsync(STYLES[name])); }
const FL = C.f || (C.f = {});
function lf(f) { const k = f.family + "|" + f.style; return FL[k] || (FL[k] = figma.loadFontAsync(f)); }
async function loadNodeFonts(t) { const fn = t.fontName; if (fn !== figma.mixed) { await lf(fn); return; } for (const seg of t.getStyledTextSegments(["fontName"])) await lf(seg.fontName); }
const created = [], warnings = [];
// preload every font the screen's text styles use (parallel) so text nodes never wait one by one
await Promise.all(Object.values(FONTS || {}).map(f => lf({ family: f[0], style: f[1] }).catch(() => lf({ family: f[0], style: f[1].replace(/([a-z])([A-Z])/g, "$1 $2") }).catch(() => null))));
// ---- inspect mode: SCREEN.INSPECT = node id -> structure/spec JSON (used by scripts/inspect.mjs) ----
async function inspectNode(id, maxDepth) {
  const root = await figma.getNodeByIdAsync(id); if (!root) throw new Error("node not found " + id);
  const vn = {}; const varName = async (b) => { if (!b) return null; const a = Array.isArray(b) ? b[0] : b; if (!a || !a.id) return null; if (!(a.id in vn)) { try { vn[a.id] = (await figma.variables.getVariableByIdAsync(a.id)).name.split("/").pop(); } catch { vn[a.id] = null; } } return vn[a.id]; };
  let count = 0;
  async function walk(n, depth) {
    if (++count > 1500) return null;
    const o = { id: n.id, n: n.name, t: n.type, w: Math.round(n.width), h: Math.round(n.height) };
    if (depth === 0) { o.x = Math.round(n.x); o.y = Math.round(n.y); const path = []; let q = n.parent; while (q && q.type !== "DOCUMENT") { path.unshift(q.type === "PAGE" ? "page: " + q.name : q.name); if (q.type === "PAGE") { o.pageId = q.id; break; } q = q.parent; } o.path = path; }
    if (n.visible === false) { o.hidden = true; return o; }
    const bv = n.boundVariables || {};
    if ("layoutMode" in n && n.layoutMode !== "NONE") { o.lm = n.layoutMode; o.g = n.itemSpacing; o.pad = [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft]; o.pa = n.primaryAxisAlignItems; o.ca = n.counterAxisAlignItems; if (n.layoutWrap === "WRAP") o.wrap = true; }
    if ("layoutSizingHorizontal" in n) { o.sh = n.layoutSizingHorizontal; o.sv = n.layoutSizingVertical; }
    if (n.type === "FRAME" || n.type === "RECTANGLE") { if (n.cornerRadius && n.cornerRadius !== figma.mixed) o.r = n.cornerRadius; const f = await varName(bv.fills && bv.fills); const fl = n.fills && n.fills !== figma.mixed && n.fills[0]; if (fl && fl.visible !== false) o.fill = f || (fl.type === "SOLID" ? "raw" : fl.type); const sk = n.strokes && n.strokes[0]; if (sk) { o.stroke = (await varName(bv.strokes && bv.strokes)) || "raw"; if (n.dashPattern && n.dashPattern.length) o.dash = true; o.sw = n.strokeTopWeight; } }
    if ("explicitVariableModes" in n && n.explicitVariableModes && Object.keys(n.explicitVariableModes).length) { o.modes = []; for (const [cid, mid] of Object.entries(n.explicitVariableModes)) { try { const col = await figma.variables.getVariableCollectionByIdAsync(cid); o.modes.push({ col: col && col.name, mode: col && (col.modes.find(m => m.modeId === mid) || {}).name, modes: col && col.modes.map(m => m.name) }); } catch (e) { o.modes.push({ cid, mid }); } } }
    if (n.type === "TEXT") { o.fs = n.fontSize === figma.mixed ? "mixed" : n.fontSize; o.ff = n.fontName === figma.mixed ? "mixed" : n.fontName.family + " " + n.fontName.style; o.c = n.characters.slice(0, 120); try { const sid = n.textStyleId; if (sid && sid !== figma.mixed) { const st = await figma.getStyleByIdAsync(sid); o.style = st.name; o.styleKey = st.key; o.styleRemote = st.remote; } } catch {} o.color = await varName(bv.fills && bv.fills); if (n.textTruncation === "ENDING") o.maxLines = n.maxLines; return o; }
    if (n.type === "INSTANCE") {
      const mc = await n.getMainComponentAsync(); const set = mc && mc.parent && mc.parent.type === "COMPONENT_SET" ? mc.parent : null;
      o.mc = mc && { id: mc.id, key: mc.key, name: mc.name, remote: mc.remote, setKey: set && set.key, setName: set && set.name, setId: set && set.id };
      o.props = {}; for (const [k, v] of Object.entries(n.componentProperties)) o.props[k.split("#")[0]] = v.value;
      o.texts = n.findAll(t => t.type === "TEXT" && vis(t, n)).slice(0, 12).map(t => t.characters.slice(0, 80));
      if (!(maxDepth >= 9)) return o; // depth >= 9 also expands inside instances (to find layer names for ops)
    }
    if (depth >= (maxDepth || 14) || !n.children) { if (n.children && maxDepth) o.kids = n.children.length; return o; }
    o.k = []; for (const c of n.children) { const w = await walk(c, depth + 1); if (w) o.k.push(w); }
    return o;
  }
  return { inspect: await walk(root, 0), roots: [], created: 0, warnings: [], ms: 0 };
}
if (SCREEN.INSPECT && !SCREEN.VARIANT && !SCREEN.SWAP && !SCREEN.MOBILIZE && SCREEN.REMOVE) { const n = await figma.getNodeByIdAsync(SCREEN.INSPECT); if (!n || !(n.getPluginData("es-root") || /Mobile \(360\)|^TEST mobile|^NEW STATES/.test(n.name))) throw new Error("refusing: not a Clause-built frame"); n.remove(); return { removed: SCREEN.INSPECT, roots: [], warnings: [] }; }
if (SCREEN.INSPECT && !SCREEN.VARIANT && !SCREEN.SWAP && !SCREEN.MOBILIZE) return await inspectNode(SCREEN.INSPECT, SCREEN.INSPECT_DEPTH);
// ---- snapshot mode: PNG of any node of the open file (scripts/snap.mjs) — lets Claude SEE frames without MCP access to the file
if (SCREEN.SNAP) {
  const n = await figma.getNodeByIdAsync(SCREEN.SNAP.id); if (!n || !("exportAsync" in n)) throw new Error("cannot snapshot " + SCREEN.SNAP.id);
  const bytes = await n.exportAsync({ format: "PNG", constraint: { type: "WIDTH", value: Math.max(200, Math.min(3000, SCREEN.SNAP.w || 1400)) } });
  return { snap: figma.base64Encode(bytes), name: n.name, w: Math.round(n.width), h: Math.round(n.height), roots: [], created: 0, warnings: [], ms: 0 };
}
// ---- file overview: pages (+ top-level children) of the open file
if (SCREEN.PAGES) {
  const out = [];
  for (const pg of figma.root.children) { try { await pg.loadAsync(); } catch (e) {} out.push({ id: pg.id, name: pg.name, children: pg.children.slice(0, 60).map(c => ({ id: c.id, n: c.name, t: c.type, w: Math.round(c.width), h: Math.round(c.height), kids: "children" in c ? c.children.length : 0 })) }); }
  return { pages: out, file: figma.root.name, fileKey: figma.fileKey || null, current: figma.currentPage.id, roots: [], created: 0, warnings: [], ms: 0 };
}

await Promise.all([...Object.keys(VARS).map(V), ...Object.keys(STYLES).map(S)]);
const TM = {};
async function tm(k, p) { const t = Date.now(); try { return await p; } finally { TM[k] = (TM[k] || 0) + (Date.now() - t); } }

function parseVariant(s) { const o = {}; for (const kv of (s || "").split(",")) { const [k, v] = kv.split("="); if (k && v) o[k.trim()] = v.trim(); } return o; }

// ---- donors: main components reachable through instances already in the open file (works when the library is gone)
async function donorIndex() {
  if (!C.donors) C.donors = { map: new Map(), list: page.findAllWithCriteria({ types: ["INSTANCE"] }), pos: 0, seen: new Set() };
  return C.donors;
}
// incremental scan of the target page's instances until the wanted component is found (cached across screens in this session)
async function donorFor(spec) {
  const D = await donorIndex(), want = () => (spec.setKey && D.map.get("s:" + spec.setKey)) || D.map.get("c:" + spec.key) || (spec.alt && ((spec.alt.setKey && D.map.get("s:" + spec.alt.setKey)) || D.map.get("c:" + spec.alt.key))) || null;
  let hit = want();
  while (!hit && D.pos < D.list.length && D.pos < 30000) {
    const inst = D.list[D.pos++]; let mc; try { mc = await inst.getMainComponentAsync(); } catch (e) { continue; } if (!mc || D.seen.has(mc.id)) continue; D.seen.add(mc.id);
    const set = mc.parent && mc.parent.type === "COMPONENT_SET" ? mc.parent : null, entry = { comp: mc, set };
    if (set && !D.map.has("s:" + set.key)) D.map.set("s:" + set.key, entry); if (!D.map.has("c:" + mc.key)) D.map.set("c:" + mc.key, entry);
    hit = want();
  }
  return hit;
}
async function component(key, props) {
  const spec = COMPS[key];
  let node;
  if (spec.lib) {
    // import by key; if the library is no longer published/enabled in this file, borrow the main component of an instance already on the page
    try {
      if (!spec.setKey) return SETS["k" + spec.key] || (SETS["k" + spec.key] = await figma.importComponentByKeyAsync(spec.key));
      node = SETS[spec.setKey] || (SETS[spec.setKey] = await figma.importComponentSetByKeyAsync(spec.setKey));
    } catch (e) {
      if (spec.alt) { try { if (!spec.alt.setKey) return (SETS["k" + spec.key] = await figma.importComponentByKeyAsync(spec.alt.key)); node = SETS[spec.alt.setKey] || (SETS[spec.alt.setKey] = await figma.importComponentSetByKeyAsync(spec.alt.setKey)); } catch (e2) { node = null; } }
      if (!node) {
      const d = await donorFor(spec); if (!d) { e.message += " [no donor instance found on the target page; scanned " + ((C.donors && C.donors.pos) || 0) + " instances]"; throw e; }
      warnings.push("imported " + key + " from an existing instance (library not available by key)");
      if (!spec.setKey) return (SETS["k" + spec.key] = d.comp);
      node = SETS[spec.setKey || spec.key] = d.set || d.comp; }
    }
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

// ---- per-instance layer index: one findAll per instance instead of one per op (ops/texts were the slowest part of a build)
const IDX = new WeakMap();
function idx(inst) { let x = IDX.get(inst); if (!x) { const all = inst.findAll(() => true); const byName = new Map(); for (const n of all) { const a = byName.get(n.name); if (a) a.push(n); else byName.set(n.name, [n]); } x = { all, byName, texts: all.filter(n => n.type === "TEXT") }; IDX.set(inst, x); } return x; }
const dropIdx = inst => IDX.delete(inst);
function inInst(inst, id) { return idx(inst).all.find(n => n.id === id || n.id.endsWith(";" + id)) || null; }
async function applyOps(inst, ops) {
  for (const op of ops || []) {
    for (const sp of op.nodes || []) {
      let hit;
      if (sp.has) { const tx = idx(inst).texts.filter(n => n.characters.includes(sp.has))[sp.nth || 0]; if (tx) { hit = tx; let up = tx.parent; while (up && up !== inst) { if (up.type === "INSTANCE" && (!sp.name || up.name === sp.name)) { hit = up; break; } up = up.parent; } } }
      else hit = (idx(inst).byName.get(sp.name) || [])[sp.nth || 0];
      if (!hit) { warnings.push("nodes: no #" + (sp.nth || 0) + " " + (sp.name || ("has:" + sp.has))); continue; }
      if (sp.hide) hit.visible = false; if (sp.show) hit.visible = true;
      if (sp.swap) { const comp = await component(sp.swap.slice(1)); try { hit.swapComponent(comp); dropIdx(inst); } catch (e) { warnings.push("nodes swap " + sp.name + ": " + e.message); } }
      if (sp.props) { const tgt = hit.type === "INSTANCE" ? hit : hit.findOne(n => n.type === "INSTANCE"); try { const defs = tgt.componentProperties, out = {}; const norm = x => String(x).replace(/[^a-z0-9 ]/gi, "").trim().toLowerCase(); for (const [k, v] of Object.entries(sp.props)) { const full = Object.keys(defs).find(d => norm(d.split("#")[0]) === norm(k)) || k; const def = defs[full]; out[full] = def && def.type === "BOOLEAN" ? (v === true || v === "true") : def && def.type === "INSTANCE_SWAP" && typeof v === "string" && v.startsWith("@") ? (await component(v.slice(1))).id : v; } tgt.setProperties(out); dropIdx(inst); } catch (e) { warnings.push("nodes props " + (sp.name || "has:" + sp.has) + ": " + e.message); } }
      if (sp.maxLines) { const t = hit.type === "TEXT" ? hit : hit.findOne(n => n.type === "TEXT"); if (t) { t.textAutoResize = "HEIGHT"; try { if (t.parent.layoutMode) t.parent.layoutSizingHorizontal = "FILL"; t.layoutSizingHorizontal = "FILL"; } catch (e) { warnings.push("maxLines fill: " + e.message); } t.textTruncation = "ENDING"; t.maxLines = sp.maxLines; } }
      if (sp.style || sp.color) { const t = hit.type === "TEXT" ? hit : hit.findOne(n => n.type === "TEXT"); if (!t) warnings.push("nodes: no text in " + sp.name); else {
        if (sp.style) { const font = FONTS[sp.style]; if (font) for (const st of [font[1], font[1].replace(/([a-z])([A-Z])/g, "$1 $2"), "Regular"]) { try { await lf({ family: font[0], style: st }); break; } catch {} } try { await t.setTextStyleIdAsync((await S(sp.style)).id); } catch (e) { warnings.push("nodes style " + sp.style + ": " + e.message); } }
        if (sp.color) await bindFill(t, sp.color, "fill"); } }
      if (sp.align) { const t = hit.type === "TEXT" ? hit : hit.findOne(n => n.type === "TEXT"); if (t) { await loadNodeFonts(t); t.textAlignHorizontal = String(sp.align).toUpperCase(); try { if (t.parent && t.parent.layoutMode) { t.parent.layoutSizingHorizontal = "FILL"; t.parent.primaryAxisAlignItems = sp.align === "right" ? "MAX" : sp.align === "center" ? "CENTER" : "MIN"; } t.layoutSizingHorizontal = "FILL"; } catch (e) {} } }
      if (sp.tint) await tintNode(hit, sp.tint);
      if (sp.icon) { const ic = hit.findOne(n => n.type === "INSTANCE"); const comp = await component(sp.icon.slice(1)); if (ic) { ic.swapComponent(comp); dropIdx(inst); } else warnings.push("nodes: no icon inside " + sp.name); }
    }
    for (const nm of op.hideNames || []) for (const t of (idx(inst).byName.get(nm) || [])) t.visible = false;
    for (const id of op.hide || []) { const t = inInst(inst, id); if (t) t.visible = false; else warnings.push("hide: not found " + id); }
    if (op.icons) {
      const mains = {};
      for (const [, src] of op.icons) { const c = inInst(inst, src); const ic = c && c.findOne(n => n.type === "INSTANCE"); mains[src] = ic ? await ic.getMainComponentAsync() : null; }
      for (const [tgt, src] of op.icons) { const c = inInst(inst, tgt); const ic = c && c.findOne(n => n.type === "INSTANCE"); if (ic && mains[src]) { ic.swapComponent(mains[src]); dropIdx(inst); } else warnings.push("icons: " + tgt + " <- " + src); }
    }
    for (const [id, props] of op.set || []) { const t = inInst(inst, id); try { t.setProperties(props); dropIdx(inst); } catch (e) { warnings.push("set " + id + ": " + e.message); } }
  }
}
function vis(n, root) { for (let p = n; p && p !== root.parent; p = p.parent) if (p.visible === false) return false; return true; }
async function setTexts(inst, text) {
  if (!text) return;
  dropIdx(inst); const nodes = idx(inst).texts.filter(t => { try { return vis(t, inst); } catch (e) { return false; } });
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
  if (n.imgB64) { try { const bin = atob(n.imgB64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); f.fills = [{ type: "IMAGE", scaleMode: "FILL", imageHash: figma.createImage(u8).hash }]; } catch (e) { warnings.push("image " + (n.i || "") + ": " + e.message); } }
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
async function buildText(n, parent) {
    let node = figma.createText(); node.name = n.i || "text";
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
  return node;
}
async function build(n, parent) {
  const T_B = Date.now(); try { return await build0(n, parent); } finally { TM.build = (TM.build || 0) + (Date.now() - T_B); }
}

// ---- variant job: clone existing frames and vary them (texts / hide / replace / add / fill), grouped in a new Section ----
async function variantJob(spec) { let sec0 = null; try { return await variantJob0(spec, s => { sec0 = s; }); } catch (e) { warnings.push("variant step failed: " + String((e && e.message) || e).slice(0, 400)); if (sec0) { try { sec0.remove(); } catch (x) {} } return { failed: true, roots: [], warnings }; } }
async function variantJob0(spec, setSec) {
  const find = (root, q) => { const hits = root.findAll(n => (q.name == null || n.name === q.name) && (q.type == null || n.type === q.type) && (q.has == null || (n.findOne && n.findOne(t => t.type === "TEXT" && t.characters.includes(q.has))) || (n.type === "TEXT" && n.characters.includes(q.has)))); return q.all ? hits : hits[q.nth || 0] ? [hits[q.nth || 0]] : []; };
  const setChars = async (t, str) => { const segs = t.getStyledTextSegments(["fontName"]); for (const g of segs) await figma.loadFontAsync(g.fontName); t.characters = str; };
  const anchor = await figma.getNodeByIdAsync(spec.anchor); if (!anchor) throw new Error("anchor not found " + spec.anchor);
  const host = anchor.type === "SECTION" ? anchor : anchor.parent; const pg = host.type === "SECTION" ? host.parent : host;
  for (const old of pg.children.filter(n => n.type === "SECTION" && n.name === spec.section)) old.remove(); // idempotent: re-running replaces the previous result
  const sec = figma.createSection(); setSec(sec); sec.name = spec.section; pg.appendChild(sec);
  sec.x = host.type === "SECTION" ? host.x : anchor.x; sec.y = (host.type === "SECTION" ? host.y + host.height : anchor.y + anchor.height) + 300;
  const res = { section: sec.id, frames: [], roots: [] }; let x = 80, maxH = 0, step = "";
  for (const v of spec.variants) {
    step = "clone"; const src = await figma.getNodeByIdAsync(v.from); if (!src) { warnings.push("variant source missing " + v.from); continue; }
    const c = src.clone(); sec.appendChild(c); c.name = v.name; c.x = x; c.y = 160; x += c.width + 120; maxH = Math.max(maxH, c.height);
    step = "texts"; for (const [f, r, nth] of v.texts || []) { const ex = f[0] === "=", ff = ex ? f.slice(1) : f; const hit = c.findAll(n => n.type === "TEXT" && (ex ? n.characters === ff : n.characters.includes(ff)) && (function vv(x) { while (x && x !== c) { if (x.visible === false) return false; x = x.parent; } return true; })(n))[nth || 0]; if (!hit) { warnings.push(v.name + ": text not found: " + f); continue; } await setChars(hit, ex ? r : (hit.characters.replace(ff, r).length ? hit.characters.replace(ff, r) : r)); }
    step = "hide"; for (const q of v.hide || []) { const hs = find(c, q); if (!hs.length) warnings.push(v.name + ": hide target not found " + JSON.stringify(q)); hs.forEach(h => h.visible = false); }
    step = "fill"; for (const q of v.fill || []) { const hs = find(c, q); if (!hs.length) { warnings.push(v.name + ": fill target not found " + JSON.stringify(q)); continue; } const paint = figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", await V(q.bg)); hs.forEach(h => { h.fills = [paint]; }); }
    for (const q of v.replace || []) { const hs = find(c, q); if (!hs.length) { warnings.push(v.name + ": replace target not found " + JSON.stringify(q)); continue; } for (const h of hs) { const comp = await component(q.comp, q.props); const inst = comp.createInstance(); const p = h.parent, i = p.children.indexOf(h); p.insertChild(i, inst); h.remove(); if (q.text) await setTexts(inst, q.text); } }
    step = "set"; for (const q of v.set || []) { let hs; if (q.near) { const t0 = c.findAll(n => n.type === "TEXT" && n.characters.includes(q.near))[q.nearNth || 0]; hs = []; let a = t0 && t0.parent; while (a && a !== c) { const f = a.findOne(n => n.name === q.name && n.type === "INSTANCE"); if (f) { hs = [f]; break; } a = a.parent; } } else hs = find(c, q); if (!hs.length) { warnings.push(v.name + ": set target not found " + JSON.stringify(q)); continue; } const norm = x => String(x).replace(/[^a-z0-9 ]/gi, "").trim().toLowerCase(); for (const h of hs) { const inst = h.type === "INSTANCE" ? h : h.findOne(n => n.type === "INSTANCE"); if (!inst) continue; try { const defs = inst.componentProperties, out = {}; for (const [k, val] of Object.entries(q.props || {})) { const full = Object.keys(defs).find(d => norm(d.split("#")[0]) === norm(k)) || k; const d0 = defs[full]; out[full] = d0 && d0.type === "BOOLEAN" ? (val === true || val === "true") : d0 && d0.type === "INSTANCE_SWAP" && typeof val === "string" && val.startsWith("@") ? (await component(val.slice(1))).id : val; } inst.setProperties(out); if (q.text) await setTexts(inst, q.text); (res.log = res.log || []).push({ v: v.name.slice(0, 12), want: q.props, got: Object.fromEntries(Object.entries(inst.componentProperties).map(([k, x]) => [k.split("#")[0], x.value])) }); } catch (e) { warnings.push(v.name + ": set " + q.name + ": " + e.message); } } }
    step = "add"; for (const q of v.add || []) { try { const ps = find(c, q.parent || {}); if (!ps.length) { warnings.push(v.name + ": add parent not found " + JSON.stringify(q.parent)); continue; } const comp = await component(q.comp, q.props); const inst = comp.createInstance(); ps[0].appendChild(inst); if (ps[0].layoutMode && ps[0].layoutMode !== "NONE") inst.layoutPositioning = "ABSOLUTE"; inst.x = q.x || 0; inst.y = q.y || 0; if (q.name) inst.name = q.name; if (q.text) await setTexts(inst, q.text); } catch (e) { warnings.push(v.name + ": add " + (q.name || q.comp) + " failed: " + String((e && e.message) || e).slice(0, 200)); } }
    step = "textsAfter"; for (const [f, r, nth] of v.textsAfter || []) { const ex = f[0] === "=", ff = ex ? f.slice(1) : f; const hit = c.findAll(n => n.type === "TEXT" && (ex ? n.characters === ff : n.characters.includes(ff)) && (function vv(x) { while (x && x !== c) { if (x.visible === false) return false; x = x.parent; } return true; })(n))[nth || 0]; if (!hit) { warnings.push(v.name + ": text not found: " + f); continue; } await setChars(hit, ex ? r : (hit.characters.replace(ff, r).length ? hit.characters.replace(ff, r) : r)); }
    step = "hideAfter"; for (const q of v.hideAfter || []) { const hs = find(c, q); if (!hs.length) warnings.push(v.name + ": hideAfter target not found " + JSON.stringify(q)); hs.forEach(h => h.visible = false); }
    res.frames.push({ id: c.id, name: c.name });
  }
  sec.resizeWithoutConstraints(x - 120 + 80, maxH + 240); res.warnings = warnings;
  return res;
}
if (SCREEN.VARIANT && SCREEN.VARIANT.debug) return { dbg: Object.keys(SCREEN.VARIANT), n: (SCREEN.VARIANT.variants || []).length, roots: [], warnings: [] };
if (SCREEN.VARIANT) return await variantJob(SCREEN.VARIANT); // after helpers (setTexts, component) are initialised

// ---- swap job: replace nodes in place with instances of library components imported by raw key (e.g. company logos) ----
async function swapJob(spec) {
  const out = { swapped: [], roots: [], warnings };
  for (const w of spec.swaps) {
    try {
      const n = await figma.getNodeByIdAsync(w.target); if (!n) { warnings.push("swap target missing " + w.target); continue; }
      if (w.copyFill) { const d = await figma.getNodeByIdAsync(w.copyFill); n.fills = d.fills; if (w.strokes) { n.strokes = d.strokes; for (const k of ["strokeWeight","strokeAlign","strokeTopWeight","strokeBottomWeight","strokeLeftWeight","strokeRightWeight"]) try { if (d[k] !== figma.mixed) n[k] = d[k]; } catch (e) {} } out.swapped.push({ id: n.id, fill: "copied" }); continue; } // copy fills (+strokes) incl. bound variables from a redesigned layer
      if (w.move) { // move: place target so its top-left sits at an anchor's bottom-right/left (+dy), in target's parent space
        const a = await figma.getNodeByIdAsync(w.move.anchor), ab = a.absoluteBoundingBox, pb = n.parent.absoluteTransform;
        const ax = w.move.alignRight ? ab.x + ab.width - n.width : ab.x; n.x = ax - pb[0][2]; n.y = ab.y + ab.height + (w.move.dy || 0) - pb[1][2];
        out.swapped.push({ id: n.id, moved: [n.x, n.y] }); continue; }
      const p = n.parent, i = p.children.indexOf(n), W = n.width, H = n.height, nm = n.name;
      let inst;
      if (w.donor) { // graft: replace target with a clone of an existing (redesigned) layer, then retext it
        const d = await figma.getNodeByIdAsync(w.donor); if (!d) { warnings.push("graft donor missing " + w.donor); continue; }
        inst = d.clone(); p.insertChild(i, inst); try { inst.layoutSizingHorizontal = d.layoutSizingHorizontal; } catch (e) {}
        for (const [name, txt, nth] of w.texts || []) { const hits = inst.findAll(x => x.name === name); const h = hits[nth || 0]; if (!h) { warnings.push("graft text layer missing " + name); continue; }
          const t = h.type === "TEXT" ? h : h.findOne(x => x.type === "TEXT"); await figma.loadFontAsync(t.fontName); t.characters = txt; }
      } else {
        const comp = w.comp ? await component(w.comp, w.props) : await figma.importComponentByKeyAsync(w.key); inst = comp.createInstance();
        if (!w.comp && (w.size || (W && H))) inst.resize(w.size || W, w.size || H); p.insertChild(i, inst);
        if (w.fill) { try { inst.layoutSizingHorizontal = "FILL"; } catch (e) { warnings.push("fill " + w.target + ": " + e.message); } }
        if (w.text) await setTexts(inst, w.text);
        for (const sub of w.hideTexts || []) inst.findAll(x => x.type === "TEXT" && x.characters.includes(sub)).forEach(x => { x.visible = false; });
        for (const q of w.hide || []) { const hs = inst.findAll(x => (x.name === q.name || (q.prefix && x.name.startsWith(q.name))) && (q.w == null || Math.round(x.width) === q.w) && x.visible !== false && x.absoluteRenderBounds !== null); const tg = q.all ? hs : hs[q.nth || 0] ? [hs[q.nth || 0]] : []; if (!tg.length) warnings.push("hide: nothing for " + q.name); tg.forEach(x => { try { x.visible = false; } catch (e) { warnings.push("hide " + q.name + ": " + e.message); } }); }
        for (const q of w.show || []) { const hs = inst.findAll(x => x.name === q.name); const t = hs[q.nth || 0]; if (t) t.visible = true; }
        for (const [f, r, nth] of w.replaceTexts || []) { const t = inst.findAll(x => x.type === "TEXT" && x.characters.includes(f) && x.absoluteRenderBounds !== null)[nth || 0]; if (!t) { warnings.push("replaceTexts missing: " + f.slice(0, 30)); continue; } for (const g of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(g.fontName); t.characters = r; }
      }
      n.remove(); if (w.name) inst.name = w.name;
      out.swapped.push({ id: inst.id, name: inst.name });
    } catch (e) { warnings.push("swap " + w.target + " failed: " + String((e && e.message) || e).slice(0, 200)); }
  }
  return out;
}
if (SCREEN.SWAP) return await swapJob(SCREEN.SWAP);

// ---- mobilize job: clone a desktop frame and re-flow it to 360px with the rules the senior mobile reference follows ----
async function mobilizeJob(spec) {
  const W = spec.width || 360, SIDE = spec.side || 20, INNER = W - 2 * SIDE;
  const src = await figma.getNodeByIdAsync(spec.source); if (!src) throw new Error("source not found " + spec.source);
  const c = src.clone(); c.name = spec.name; c.setPluginData("es-root", "1"); c.x = src.x + src.width + 200; c.y = src.y;
  const stats = { rows: 0, wrapped: 0, texts: 0, images: 0, widths: 0 }; const FOK = {};
  const O = new Map(); (function rec(n) { O.set(n.id, { w: n.width, h: n.height }); if ("children" in n) n.children.forEach(rec); })(c); // ORIGINAL desktop sizes: decisions must not depend on widths already shrunk by a parent
  const ow = k => (O.get(k.id) || { w: k.width }).w;
  c.layoutSizingHorizontal = "FIXED"; c.resize(W, c.height);
  const fsMap = fs => fs >= 44 ? Math.round(fs * 0.75) : fs >= 36 ? Math.round(fs * 0.75) : fs >= 28 ? Math.round(fs * 0.8) : (fs === 16 && spec.eyebrow16to14) ? fs : fs;
  const inAL = n => n.parent && "layoutMode" in n.parent && n.parent.layoutMode !== "NONE";
  const isInstanceInner = n => { let p = n.parent; while (p) { if (p.type === "INSTANCE") return true; p = p.parent; } return false; };
  async function fit(n, depth) {
    if (n.visible === false) return;
    if (n.type === "TEXT") {
      stats.texts++;
      try {
        if (!isInstanceInner(n)) {
          const segs = n.getStyledTextSegments(["fontName", "fontSize"]); let fontsOk = true; for (const g of segs) { const fk = g.fontName.family + "|" + g.fontName.style; if (!(fk in FOK)) { try { await figma.loadFontAsync(g.fontName); FOK[fk] = true; } catch (e) { FOK[fk] = false; warnings.push("font not loadable: " + fk + " — " + String(e.message).slice(0, 80)); } } if (!FOK[fk]) fontsOk = false; } if (!fontsOk) return;
          const fs = n.fontSize; if (fs !== figma.mixed) { const t = fsMap(fs); if (t !== fs) { n.fontSize = t; if (n.lineHeight !== figma.mixed && n.lineHeight.unit === "PIXELS") n.lineHeight = { unit: "PIXELS", value: Math.round(t * n.lineHeight.value / fs) }; } }
          else for (const g of segs) { const t = fsMap(g.fontSize); if (t !== g.fontSize) n.setRangeFontSize(g.start, g.end, t); }
          n.textAutoResize = "HEIGHT";
          if (inAL(n) && n.layoutPositioning !== "ABSOLUTE" && n.width > 60) n.layoutSizingHorizontal = "FILL";
        }
      } catch (e) { warnings.push("text " + n.name + ": " + e.message); }
      return;
    }
    if (n.type === "INSTANCE" && spec.detachLarge !== false && (n.height > 150 || n.width > 600) && !isInstanceInner(n)) {
      // big layout components keep their desktop structure inside: detach this clone's copy so it can be re-flowed (the desktop original stays linked)
      try { const nm = n.name; const f = n.detachInstance(); (stats.detached = stats.detached || []).push(nm); await fit(f, depth); return; } catch (e) { warnings.push("detach " + n.name + ": " + e.message); }
    }
    if (n.type === "INSTANCE" || n.type === "COMPONENT") {
      try { if (n.width > INNER && inAL(n) && n.layoutPositioning !== "ABSOLUTE") { n.layoutSizingHorizontal = "FILL"; stats.widths++; } } catch (e) {}
      return; // component internals stay as designed
    }
    if (!("children" in n)) {
      if ((n.type === "RECTANGLE" || n.type === "ELLIPSE") && n.width > INNER && n.layoutPositioning !== "ABSOLUTE") { try { const r = INNER / n.width; n.resize(INNER, Math.max(1, Math.round(n.height * r))); if (inAL(n)) n.layoutSizingHorizontal = "FILL"; stats.images++; } catch (e) {} }
      return;
    }
    if ((spec.keep || []).includes(n.name)) { try { n.clipsContent = true; if (inAL(n)) { n.layoutSizingHorizontal = "FILL"; } else n.resize(Math.min(n.width, W), n.height); if ("layoutMode" in n && n.layoutMode !== "NONE") n.layoutSizingVertical = "HUG"; stats.kept = (stats.kept || 0) + 1; } catch (e) { warnings.push("keep " + n.name + ": " + e.message); } return; } // marquee-like rows: stay as designed, clipped to the frame
    // containers
    if (n.type === "FRAME" || n.type === "GROUP" || n.type === "COMPONENT") {
      if ("layoutMode" in n && n.layoutMode !== "NONE") {
        const kids = n.children.filter(k => k.visible !== false && k.layoutPositioning !== "ABSOLUTE");
        const total = kids.reduce((a, k) => a + ow(k), 0) + n.itemSpacing * Math.max(0, kids.length - 1);
        const iconRow = n.layoutMode === "HORIZONTAL" && kids.length >= 2 && kids.some(k => ow(k) <= 28 && k.height <= 28) && kids.filter(k => ow(k) > 28).length <= 1; // bullet/icon + content stays a row
        if (iconRow) { for (const k of kids) { try { if (ow(k) > 28 && (k.type === "TEXT" || "layoutMode" in k)) k.layoutSizingHorizontal = "FILL"; } catch (e) {} } }
        else if (n.layoutMode === "HORIZONTAL" && kids.length >= 2 && total > INNER) {
          if (kids.every(k => ow(k) <= 220 && k.height <= 60)) { n.layoutWrap = "WRAP"; n.counterAxisSpacing = Math.min(n.itemSpacing || 8, 12); stats.wrapped++; }
          else { n.layoutMode = "VERTICAL"; n.primaryAxisAlignItems = "MIN"; n.counterAxisAlignItems = "MIN"; n.itemSpacing = Math.max(16, Math.min(n.itemSpacing, 24)); stats.rows++; for (const k of kids) { try { k.layoutSizingHorizontal = "FILL"; if ("layoutMode" in k && k.layoutMode !== "NONE" && k.layoutSizingVertical === "FIXED") k.layoutSizingVertical = "HUG"; } catch (e) {} } }
        }
        // content may now be taller than the desktop height: hug vertically (decorative childless boxes keep their size)
        if (n.children.length > 0 && depth > 0) { try { if (n.layoutSizingVertical === "FIXED" || n.layoutSizingVertical === "FILL") n.layoutSizingVertical = "HUG"; } catch (e) {} }
        // paddings and gaps
        const cap = (v, lim, to) => v >= lim ? to : v;
        n.paddingLeft = cap(n.paddingLeft, 48, SIDE); n.paddingRight = cap(n.paddingRight, 48, SIDE);
        n.paddingTop = n.paddingTop >= 100 ? 60 : n.paddingTop >= 60 ? 40 : n.paddingTop; n.paddingBottom = n.paddingBottom >= 100 ? 60 : n.paddingBottom >= 60 ? 40 : n.paddingBottom;
        if (n.layoutMode === "VERTICAL") n.itemSpacing = n.itemSpacing >= 100 ? 60 : n.itemSpacing >= 60 ? 40 : n.itemSpacing;
        // width
        if (n.width > W && depth > 0) { try { if (inAL(n)) { n.layoutSizingHorizontal = "FILL"; } else n.resize(W, n.height); stats.widths++; } catch (e) {} }
        else if (depth > 0 && n.width > INNER && inAL(n) && n.layoutSizingHorizontal === "FIXED") { try { n.layoutSizingHorizontal = "FILL"; stats.widths++; } catch (e) {} }
        if (n.layoutMode === "VERTICAL" && n.counterAxisSizingMode === "FIXED" && depth > 0) { /* keep */ }
      }
    }
    for (const k of [...n.children]) await fit(k, depth + 1);
  }
  await fit(c, 0);
  async function setParts(t, find, parts) {
    const segs = t.getStyledTextSegments(["fontName", "fontSize", "fills", "lineHeight", "letterSpacing"]); const full = t.characters;
    if (!full.includes(find)) { warnings.push("block text not found: " + find.slice(0, 30)); return; }
    for (const g of segs) await figma.loadFontAsync(g.fontName);
    const styleOf = i => segs[Math.min(i, segs.length - 1)];
    let out = ""; const ranges = []; for (const [txt, si] of parts) { ranges.push([out.length, out.length + txt.length, si]); out += txt; }
    t.characters = out;
    for (const [a, b, si] of ranges) { const g = styleOf(si); if (b > a) { t.setRangeFontName(a, b, g.fontName); t.setRangeFontSize(a, b, g.fontSize); t.setRangeFills(a, b, g.fills); } }
  }
  for (const q of spec.blocks || []) {
    try {
      const hits = c.findAll(n => n.name === q.name && n.visible !== false); const old = hits[q.nth || 0]; if (!old) { warnings.push("block not found: " + q.name); continue; }
      const ref = await figma.getNodeByIdAsync(q.from); if (!ref) { warnings.push("block source missing " + q.from); continue; }
      const nn = ref.clone(); const par = old.parent, idx = par.children.indexOf(old); par.insertChild(idx, nn); old.remove();
      if (par.layoutMode && par.layoutMode !== "NONE") { try { nn.layoutSizingHorizontal = "FILL"; } catch (e) {} }
      for (const [find, parts] of q.texts || []) { const t = nn.findAll(x => x.type === "TEXT" && x.characters.includes(find))[0]; if (!t) { warnings.push("block text missing: " + find.slice(0, 30)); continue; } if (typeof parts === "string") { for (const g of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(g.fontName); t.characters = t.characters.replace(find, parts); } else await setParts(t, find, parts); }
      (stats.blocks = stats.blocks || []).push(q.name);
    } catch (e) { warnings.push("block " + q.name + ": " + String((e && e.message) || e).slice(0, 160)); }
  }
  if (spec.hide) for (const q of spec.hide) { c.findAll(n => n.name === q.name).slice(q.nth || 0, q.all ? undefined : (q.nth || 0) + 1).forEach(h => { h.visible = false; }); }
  return { id: c.id, name: c.name, stats, roots: [], warnings };
}
if (SCREEN.MOBILIZE) return await mobilizeJob(SCREEN.MOBILIZE);
async function build0(n, parent) {
  let node;
  if (n.c) {
    const comp = await tm("component", component(n.c, n.p));
    const T_I = Date.now(); node = comp.createInstance(); if (n.i) node.setPluginData("es-i", n.i); // layer keeps the component's own name; the JSON id lives in plugin data (es-i)
    parent.appendChild(node); TM.inst = (TM.inst || 0) + (Date.now() - T_I); TM["inst:" + (n.i || comp.name)] = Date.now() - T_I;
    await tm("props", setBoolProps(node, n.p));
    await tm("ops", applyOps(node, n.ops));
    await tm("texts", setTexts(node, n.text));
    if (n.tint) await tintNode(node, n.tint);
  } else if (n.t === "text") {
    const T_T = Date.now(); try { node = await buildText(n, parent); } finally { TM.text = (TM.text || 0) + (Date.now() - T_T); }
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
const T_RM = Date.now(); const OLD = new Set(SCREEN.OLD_ROOTS || []);
const stale = page.children.filter(n => n.type === "FRAME" && wanted.has(n.name) && !OLD.has(n.id));
if (stale.length) { x = Math.min(...stale.map(n => n.x)); replaced = true; for (const n of stale) n.remove(); }
// sweep leftovers of earlier FAILED builds of this screen (Clause-made, never finished/tagged, not the frame being replaced) — works even with an older plugin wrapper
{ const secN = SCREEN.SECTION ? await figma.getNodeByIdAsync(SCREEN.SECTION) : null; const pools = [page.children]; if (secN && secN.children) pools.push(secN.children); let swept = 0;
  for (const pool of pools) for (const n of [...pool]) if (n.type === "FRAME" && !OLD.has(n.id) && !n.getPluginData("es-screen") && (n.getPluginData("es-root") || n.getPluginData("es-sec")) && n.name === TITLE) { n.remove(); swept++; }
  if (swept) warnings.push("removed " + swept + " leftover frame(s) from earlier failed builds"); }
const oldRoots = []; for (const id of OLD) { const n = await figma.getNodeByIdAsync(id); if (n) oldRoots.push(n); }
// reuse index: top-level children of the previous build, by name → { node, hash }
const REUSE = new Map(); for (const r of oldRoots) for (const ch of r.children) { const h = ch.getPluginData("es-hash"); if (h) REUSE.set(ch.getPluginData("es-i") || ch.name, { node: ch, hash: h }); }
const SALT = JSON.stringify([COMPS, VARS, STYLES]).length + ":" + (SCREEN.RT_HASH || "") + ":n4";
const hashOf = o => { const str = SALT + JSON.stringify(o); let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return String(h); };
if (REPLACE) { const old = await figma.getNodeByIdAsync(REPLACE); if (old) { x = old.x; old.remove(); replaced = true; } }
if (POS) { x = POS.x; replaced = true; }
if (!replaced) for (const ch of page.children) x = Math.max(x, ch.x + ch.width + 200);
TM.prep = Date.now() - T_RM;
const roots = [], rootNodes = [];
for (const [name, tree] of SCREENS) {
  const rootF = figma.createFrame(); rootF.name = TITLE + (SCREENS.length > 1 ? " — " + name : ""); rootF.setPluginData("es-root", "1"); (C.pending || (C.pending = [])).push(rootF.id); // tracked so a failed build can be cleaned up
  const SEC = SCREEN.SECTION ? await figma.getNodeByIdAsync(SCREEN.SECTION) : null;
  if (SEC && SEC.type === "SECTION") {
    // build inside a Section: positions are section-relative; new screens go to the right of the last frame; the section grows to fit
    SEC.appendChild(rootF);
    const kids = SEC.children.filter(c => c !== rootF && c.type !== "SECTION");
    rootF.x = POS ? POS.x : kids.length ? Math.max(...kids.map(c => c.x + c.width)) + 160 : 80; rootF.y = POS ? POS.y : kids.length ? Math.min(...kids.map(c => c.y)) : 80;
    rootF.setPluginData("es-sec", "1");
  } else { page.appendChild(rootF); rootF.x = x; rootF.y = POS ? POS.y : 0; }
  await applyBox(rootF, Object.assign({ t: "stack" }, tree, { i: rootF.name }));
  rootF.resize(WIDTH, HEIGHT || 900);
  rootF.primaryAxisSizingMode = HEIGHT ? "FIXED" : "AUTO"; rootF.counterAxisSizingMode = "FIXED";
  if (!tree.bg && VARS["bg-primary"]) await bindFill(rootF, "bg-primary", "fill");
  for (const ch of (tree.children || [])) {
    const h = ch.i ? hashOf(ch) : null; const prev = h && REUSE.get(ch.i);
    if (prev && prev.hash === h) { const T_R = Date.now(); rootF.appendChild(prev.node); REUSE.delete(ch.i); TM.reused = (TM.reused || 0) + (Date.now() - T_R); TM["reused:" + ch.i] = 1; continue; }
    const node = await build(ch, rootF); if (node && h) node.setPluginData("es-hash", h);
  }
  roots.push(rootF.id); rootNodes.push(rootF); x += WIDTH + 200;
}
const T_VP = Date.now(); if (page.id === figma.currentPage.id) { for (const rn of rootNodes) { const sp = rn.parent; if (sp && sp.type === "SECTION") sp.resizeWithoutConstraints(Math.max(sp.width, rn.x + rn.width + 80), Math.max(sp.height, rn.y + rn.height + 80)); } if (!SCREEN.SILENT) figma.viewport.scrollAndZoomIntoView(rootNodes); } TM.viewport = Date.now() - T_VP;
const T_OLD = Date.now(); for (const r of oldRoots) { try { r.remove(); } catch (e) {} } TM.removeOld = Date.now() - T_OLD;
return { roots, created: created.length, warnings, removedDuplicates: stale.length, timing: Object.assign({ totalMs: Date.now() - T_START }, TM) };
