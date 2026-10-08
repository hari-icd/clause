# Clause — screen generation

You compose product screens as JSON. A script turns JSON into Figma frames of real library components. You never write Figma code, HTML, or CSS.

## Contract
0. Read `docs/POWER-USE.md` (tricks that keep the loop fast; append new ones there the moment they land).
1. Read `ds/design-rules.md` **Standing preferences** first — every correction the user ever gave; apply them unasked and append new ones the moment they arrive. Then `ds/components.json` (component keys, props, default variant, placeholder texts). Never grep Figma or re-probe — the catalog is complete. No `ds/components.json` yet → run `/onboard` (you drive setup, server, extraction; the user only does the Figma clicks).
2. Write `screens/<kebab-name>.json`. Schema in `docs/SCHEMA.md`. Every component/text/box node needs a unique `i`.
3. The PostToolUse hook lints on write. Fix until it prints `clean`.
4. Build: `npm run live` is running and the Clause Assist plugin is started → saving `screens/<name>.json` rebuilds the frame in place within ~2s. No tool call needed. New screens land on the page the user is viewing in Figma; rebuilds stay where the screen already is (`"page"` in the JSON pins one).
5. `curl -s localhost:8787/result` gives the root frame id + warnings (any warning = bug); `get_screenshot` it. Reply with: frame id, screenshot, components used, any region built from primitives and why. One question max.

## Rules
- Props use Figma axis names and values verbatim from `components.json`. Booleans `"true"`/`"false"`.
- `text`: array = override visible text layers in order; object = `{ "placeholder substring": "new text" }`. Match against the `texts` list in the catalog.
- `gap`/`pad`/`px`/`py`/`radius` take token names (`"md"`, `"3xl"`). `bg`/`border`/`color` take variable aliases (`bg-primary`, `border-secondary`, `text-tertiary`). Raw numbers only with a `why`. Never hex.
- No empty spacer boxes. Parent `gap` owns rhythm. `{"t":"spacer"}` only for push-apart in a row.
- Prefer a catalog component over primitives. Primitive = recorded exception.
- Copy is real product content for this design system (see `ds/config.md` → product). No lorem.
- Light mode unless `ds/config.md` says otherwise. If two generations of a component exist, ask once which is current and record it in `ds/design-rules.md`.
- Do not run `use_figma` writes without the user saying go on a new screen; iterations on an approved screen may proceed.

## Schema extras (full schema: docs/SCHEMA.md)
- Component node: `ops` = `[{"hide":[ids]},{"icons":[[targetId,sourceId]]},{"set":[[id,{props}]]}]` for layers inside an instance (ids from `get_metadata` of the component).
- Icon swap props take `"@icon-key"` (e.g. `"Icon leading swap": "@icon-plus"`).
- Text: `maxLines` for ellipsis. Row: `wrap:true` + `rowGap` for card grids (give cards fixed `w`, not `fill`).
- `abs:{x,y}` overlays a node (needs `why`). `replace:"<frameId>"` rebuilds a frame in place.
- Reference screenshot given? Build, screenshot, compare region by region; fix and rebuild with `replace`. Expect 2–4 rounds.

## HTML exports
- `exports/<name>.html` is generated, never hand-edited. Listing: `http://localhost:8787/`. It becomes a real DOM once the Figma plugin has built the screen ("built from Figma" tag); before that it is an approximate render.
- Change how HTML is produced in `scripts/extract.js` (Figma → DOM) or `scripts/to-html.mjs` (DOM → file); tokens in `scripts/tokens-css.mjs`.

