# Screen JSON schema

One file per screen in `screens/<kebab-name>.json`. The compiler validates it against `ds/components.json` + `ds/variable-keys.json`; the builder turns it into a Figma frame of real instances.

```json
{
  "title": "Invoice list",
  "height": 900,
  "tree": {
    "t": "row", "gap": "none", "clip": true,
    "children": [
      { "c": "main-nav", "i": "nav", "p": { "types": "Expanded" }, "fill": "y", "text": ["New chat", "Projects"] },
      { "t": "stack", "i": "main", "grow": true, "fill": "y", "gap": "3xl", "pad": "4xl", "bg": "bg-secondary",
        "children": [
          { "t": "text", "i": "title", "content": "Invoices", "style": "Display md/Semibold", "color": "text-primary" },
          { "c": "button-brand", "i": "btn-new", "p": { "Size": "md", "Hierarchy": "Primary", "Icon leading": "true", "Icon leading swap": "@icon-plus" }, "text": { "Button": "New invoice" } }
        ] }
    ]
  }
}
```

## Nodes
- **Component** `{ "c": "<catalog key>", "i": "<unique id>", "p": {…}, "text": …, "ops": […] }`
  - `p`: Figma axis names and values verbatim from the catalog. Booleans `"true"`/`"false"`. INSTANCE_SWAP props take `"@icon-key"`.
  - `text`: array = override visible text layers in order; object = `{ "placeholder substring": "new text" }` (matched against the catalog `texts`).
  - `ops`: edit layers inside the instance — `{"hideNames":[…]}`, `{"hide":[layerIds]}`, `{"set":[[layerId,{props}]]}`, `{"icons":[[targetId,sourceId]]}`, `{"nodes":[{"name":"<layer>","nth":0, "hide":true | "icon":"@key" | "swap":"@key" | "props":{…} | "style":"Text sm/Regular" | "color":"text-secondary" | "maxLines":2 | "align":"right" | "tint":"icon-white"}]}`.
- **Layout** `t`: `stack` (column) · `row` · `text` · `spacer` (push-apart in a row only).
  - Spacing: `gap` `rowGap` `pad` `px` `py` `pt` `pb` `pl` `pr` take token names (`"md"`, `"3xl"`). `radius` likewise.
  - Color: `bg` `border` `borderB/L/T/R` `color` `tint` take variable aliases (`bg-primary`, `border-secondary`, `text-tertiary`). `bg: "none"` clears a fill. Never hex.
  - Size: `w` `h` (px) · `fill` `"x"|"y"|"both"` · `grow` · `wrap` + `rowGap` for card grids (fixed `w` on cards) · `clip` · `dash` · `opacity` · `bgBlur`.
  - Align: `justify` start|center|end|between · `align` start|center|end.
  - `abs: {x, y}` overlays a node (needs `why`). `replace: "<frameId>"` rebuilds a frame in place.
- **Text** `{ "t": "text", "content" | "runs": [{"x":"…","b":true,"i":true,"code":true}], "style": "<text style>", "color": "<alias>", "maxLines": 2 }`. `size`/`lh` overrides need a `why`.
- Raw numbers for spacing/radius are allowed only with a `why` on the node (recorded exception).
- Multi-state: `"screens": [{ "name", "tree" }]` instead of `tree`.

## Lint (hard fail)
Unknown `c` key · prop not on that component / value not in its axis · unknown token or alias · raw hex · raw px without `why` · duplicate or missing `i` · unknown text style.

## Builder warnings (always a bug)
`prop not applied …` (readback after setProperties) · `variant not matched …` · `text not found in …` · `nodes: no #n <layer>` · `style …` / `font fallback …`.
