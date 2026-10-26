import fs from "node:fs";
const T = process.env.TMPDIR;
const A = JSON.parse(fs.readFileSync("ds/files/announcements/components.json"));
const key = k => A.library.find(x => x.key === k).variantKey;
const ids = process.argv.slice(2);
const all = n => n.c != null ? [n.c] : (n.k || []).flatMap(all);
const first = n => all(n)[0], last = n => all(n).slice(-1)[0];
for (const id of ids) {
  const c = JSON.parse(fs.readFileSync(`${T}/c_${id}.json`));
  const tabs = c.k.find(x => x.n === "Tabs"), head = c.k.find(x => x.n === "Header row"), rows = c.k.filter(x => x.n.startsWith("Row"));
  const tabFrames = tabs.k.filter(x => x.n.startsWith("Tab /"));
  const labels = tabFrames.length ? tabFrames.map(t => all(t.k[0]).join(" ")) : tabs.k.filter(x => x.t === "TEXT").map(x => x.c);
  const keep = tabs.k.filter(x => x.t === "INSTANCE" && /search|list/.test(x.n)).map(x => x.id);
  const hide = []; for (let k = labels.length + 1; k <= 9; k++) hide.push("Tab " + k);
  const cols = head.k.map(h => ({ w: h.w, t: first(h) }));
  const fillIdx = cols.reduce((b, x, i) => x.w > cols[b].w ? i : b, 0);
  const columns = cols.map((col, i) => ({ name: "Col / " + col.t, header: col.t.toUpperCase(), ...(i === fillIdx ? { fill: true } : { w: col.w }), cells: rows.map(r => {
    const cell = r.k[i], cn = cell.n;
    if (cn === "Cell / Status") { const p = cell.k[0]; return { pill: true, props: { Color: p.props.Color }, text: p.texts[0] }; }
    if (cn === "Cell / Person") { const nm = last(cell); return { props: { Style: "Avatar with text" }, text: [nm.split(" ").map(x => x[0]).join(""), nm] }; }
    if (cn === "Cell / Name" || cn === "Cell / Source") return { iconText: true, props: { Style: "Icon with text and badge" }, text: { "$1,800": last(cell) } };
    return { text: [first(cell)] }; }) }));
  const spec = { swaps: [{ target: id, table: { tabs: { key: key("horizontal-tabs"), props: { Style: "Default", "Start Icon Style": "None", Size: "sm", "Add New Icon": "false" }, text: labels, hide, padT: 6, padL: 0, padR: 16, keepNodes: keep },
    header: { key: key("col-header-cell"), props: { Size: "md", Text: "True", Checkbox: "False", State: "Default", "Data Icon": "Off" } },
    cell: { key: key("table-cell"), props: { Style: "Text", Lead: "No", State: "Default", Size: "md", "Supporting Text": "false", Badge: "false", Dropdown: "false" } },
    pill: { key: key("pill-squared"), props: { Size: "sm", Type: "Pill color", Icon: "Dot" } }, fileIconKey: "6ecdfa5ac2d038f555b94f80ff7a8c2eb79fdbb6", rowH: 48, columns } }] };
  fs.writeFileSync(`${T}/tbl_${id.replace(":", "_")}.json`, JSON.stringify(spec));
  console.log(id, labels.join("|"), "keep", keep.length, "cols", columns.map(x => x.header + (x.fill ? "*" : "")).join(","), "rows", rows.length);
}
