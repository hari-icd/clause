import fs from "node:fs";
const d = JSON.parse(fs.readFileSync("drafts/15079-58316.json", "utf8"));
const rail = d.tree.children[0];
rail.i = "rail";
const navIcons = ["plus","book-open-01","lock-01","layout-grid-02","inbox-02","ticket-01","folder"];
rail.children[1].children.forEach((n, k) => { n.i = "nav" + k; n.ops = [{ nodes: [{ name: navIcons[0] === navIcons[k] ? "plus" : "plus", swap: "@icon-" + navIcons[k] }] }]; });
rail.children[0].i = "rail-head"; rail.children[0].children[0].i = "logo"; rail.children[0].children[0].children[1].i = "wordmark"; rail.children[0].children[1].i = "rail-toggle";
rail.children[1].i = "nav-items"; rail.children[2].i = "history"; rail.children[2].children[0].i = "history-sub"; rail.children[3] = { t: "spacer", i: "rail-push" }; rail.children[4].i = "rail-user";
const logo = rail.children[0].children[0].children; logo[0] = { c: "feather", i: "logo-mark" };
const H = { Size: "md", Text: "True", Checkbox: "False", State: "Default", "Data Icon": "Off" };
const cell = (i, style, text, w, extra = {}) => ({ c: "table-cell", i, p: { Style: style, Lead: "No", State: "Default", Size: "md", "Supporting Text": "false", Badge: "false", Dropdown: "false" }, text, ...(w ? { w } : { fill: "x" }), ...extra });
const cols = [["Name", 0], ["Type", 120], ["Status", 130], ["Version", 90], ["Used", 80], ["Owner", 190], ["Last updated", 130]];
const right = new Set(["Version", "Used", "Last updated"]);
const rows = [
 ["Reseller Agreement", "Agreement", "Draft", "v1", "0", "Aarav Mehta", "27 Sept 2026"],
 ["Mutual NDA", "Agreement", "Published", "v4", "48", "Priya Nair", "24 Sept 2026"],
 ["Master Services Agreement — short form", "Agreement", "Published", "v3", "34", "Priya Nair", "17 Sept 2026"],
 ["Order Form", "Order form", "Published", "v5", "63", "Kavya Iyer", "11 Sept 2026"],
 ["One-way NDA", "Agreement", "Published", "v2", "21", "Priya Nair", "2 Sept 2026"],
 ["Data Processing Addendum", "Addendum", "Published", "v2", "27", "Priya Nair", "29 Aug 2026"],
 ["Notice of Non-renewal", "Letter", "Published", "v1", "9", "Aarav Mehta", "14 Aug 2026"],
];
const thead = { t: "row", i: "thead", fill: "x", align: "center", borderB: "border-secondary", children: cols.map(([n, w], k) => ({ c: "col-header-cell", i: "h" + k, p: H, text: [n], bg: "none", ...(w ? { w } : { fill: "x" }), ...(right.has(n) ? { ops: [{ nodes: [{ name: "Text", align: "right" }] }] } : {}) })) };
const body = rows.map((r, j) => ({ t: "row", i: "tr" + j, fill: "x", align: "center", children: [
  cell("n" + j, "Icon with text and badge", { "$1,800": r[0] }, 0, { ops: [{ hide: [], nodes: [{ name: "Pill squared", hide: true }, { name: "Text", show: true }, { name: "placeholder", swap: "@icon-file-05" }] }] }),
  cell("t" + j, "Text", [r[1]], 120),
  { t: "row", i: "s" + j, w: 130, px: "md", align: "center", bg: "bg-primary", children: [{ c: "pill-squared", i: "sp" + j, p: { Size: "sm", Type: "Pill Clear", Icon: "Dot", Color: r[2] === "Draft" ? "Warning" : "Success" }, text: [r[2]] }] },
  cell("v" + j, "Text", [r[3]], 90, { ops: [{ nodes: [{ name: "Text", align: "right" }] }] }),
  cell("u" + j, "Text", [r[4]], 80, { ops: [{ nodes: [{ name: "Text", align: "right" }] }] }),
  cell("o" + j, "Avatar with text", [r[5].split(" ").map(x => x[0]).join(""), r[5]], 190),
  cell("d" + j, "Text", [r[6]], 130, { ops: [{ nodes: [{ name: "Text", align: "right" }] }] }),
] }));
// columns of stacked cells (header + one cell per row) instead of row-by-row
const tableCols = { t: "row", i: "table", fill: "x", align: "start", children: cols.map(([n, w], k) => {
  const cells = [thead.children[k], ...body.map(r => r.children[k])];
  cells.forEach((c, m) => { if (c.t === "row" && m) { c.h = 48; c.borderB = "border-secondary"; } if (w) { c.w = w; delete c.fill; } else { c.fill = "x"; } });
  return { t: "stack", i: "col" + k, gap: "none", ...(w ? { w } : { fill: "x" }), children: cells };
}) };
const tabs = { t: "row", i: "tabs", fill: "x", px: "xl", align: "center", borderB: "border-secondary", children: [
  { c: "horizontal-tabs", i: "tabset", p: { Style: "Default", "Start Icon Style": "None", Size: "sm", "Add New Icon": "false" }, text: ["All 7", "Agreements 4", "Addenda 1", "Order Forms 1", "Letters 1"], fill: "x", ops: [{ nodes: [6, 7, 8, 9].map(n => ({ name: "Tab " + n, hide: true })) }] },
  { c: "icon-search-md", i: "tabs-search", w: 16, h: 16 } ] };
const header = d.tree.children[1].children[0]; header.i = "page-head"; header.children[0].i = "page-title"; header.children[1].i = "new-template";
header.children[1].p = { Size: "md", Hierarchy: "Primary", "Icon leading": "true", "Icon leading swap": "@icon-plus", "Icon trailing": "false" };
const main = { t: "stack", i: "main", gap: "3xl", pad: "5xl", fill: "x", bg: "bg-workspace", grow: true, fill: "y", children: [header,
  { t: "stack", i: "table-card", fill: "x", radius: "4xl", bg: "bg-primary", border: "border-secondary", clip: true, children: [tabs, tableCols] }] };
const screen = { title: "Templates · 43 List (library)", ds: "ds/files/clients", page: "12098:475393", section: "15041:10639", width: 1440, height: 900,
  tree: { t: "row", i: "root", gap: "none", clip: true, children: [rail, main] } };
const clean = n => { for (const k of ["color","bg","border","borderB"]) if (typeof n[k] === "string") n[k] = n[k].replace(/ \(.*\)$/, ""); (n.children || []).forEach(clean); }; clean(screen.tree);
fs.writeFileSync("screens/clavia-templates-list.json", JSON.stringify(screen, null, 1));
