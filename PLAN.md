# Clause (was ES DS) — Screen Generation

Brief → `screens/<name>.json` → script → Figma frame of real ES library components, variable-bound.
Agent writes JSON only. Script places nodes. Figma is the output.

---

## Files

```
CLAUDE.md               20 lines: read registry, write JSON, run build. Link to design-rules.
ds/
  config.md             ES library key, canvas key, fonts, breakpoint
  tokens.json           Figma Variables export (get_variable_defs). Never hand-edit.
  components.json       component sets: name, node id, library key per variant, axes + values, text layers
  design-rules.md       ES visual rules. Short. Grows from real screens.
registry.json           generated from components.json + tokens.json. Agent's only map.
screens/<name>.json     agent-written screen specs
scripts/
  extract.mjs           Figma exports → ds/tokens.json, ds/components.json, registry.json
  lint.mjs              4 checks
  build.mjs             screens/<name>.json → use_figma script string
.claude/skills/screen/  the one skill
```

Carry from Flaude: JSON schema, `tokens-css.mjs` alias-chasing, plugin-API build logic from `figma-plugin/main.js`. From unify-trial-ds: `principles/figma-plugin-api.md` gotchas. Nothing else yet.

---

## Screen JSON

```json
{
  "title": "Invoice list",
  "tree": {
    "t": "stack", "dir": "col", "gap": "3xl", "pad": "4xl",
    "children": [
      { "c": "page-header", "i": "hdr", "p": { "Size": "md" }, "text": { "Title": "Invoices" } },
      { "t": "row", "gap": "lg", "justify": "between", "children": [
        { "c": "button", "i": "btn-new", "p": { "Hierarchy": "Primary" }, "text": { "Label": "New invoice" } }
      ]},
      { "t": "box", "i": "card", "bg": "bg-primary", "border": "border-secondary", "radius": "xl", "pad": "2xl", "children": [] }
    ]
  }
}
```

- `c` = registry key. `p` = Figma axis names/values verbatim. `text` = layer name → content.
- `t` = stack | row | box | text | spacer. gap/pad/radius = token names. bg/border/color = variable names.
- Every node unique `i`. Multi-screen: `"screens": [{name, tree}]` instead of `tree`.

---

## Lint (hard-fail)

1. Unknown `c` key
2. `p` value not in that set's axis values
3. Raw hex / raw px anywhere
4. Duplicate or missing `i`

Hook: on Write/Edit `screens/*.json`, run lint, surface result.

---

## Build

`node scripts/build.mjs <name>` → prints plugin-API JS. Agent sends via `use_figma`.

Script does: import variables + component keys by key (from `components.json`) → create frames with auto-layout → `createInstance` + `setProperties` for `c` nodes → set text by layer name → bind fills/spacing/radius to variables → place 1440-wide frame at viewport.

Known gotchas (from `figma-plugin-api.md`): `loadFontAsync` before text; set `layoutSizingHorizontal=FILL` after parenting; re-FILL children after padding changes.

If `use_figma` size limit bites → chunk script, or revive Flaude plugin paste. Not before.

---

## /screen skill

1. Read `registry.json` and `ds/design-rules.md`.
2. Write `screens/<name>.json`. Hook lints.
3. `node scripts/build.mjs <name>` → `use_figma`.
4. `get_screenshot` the frame.
5. Reply: frame link, screenshot, components used, any region built from primitives + why. One question max.

---

## Steps

1. Get ES library URL + canvas URL. Canvas in ICD team.
2. `extract.mjs`: `get_variable_defs` + `get_metadata` on library → `ds/`, `registry.json`.
3. `build.mjs` + `lint.mjs`. Port from Flaude plugin + build-tokens.
4. `/screen` skill + CLAUDE.md. Build one real screen. Measure agent tokens.
5. Ship to one dev. Collect mismatch feedback. Fix what broke.

Done when: prompt → Figma frame, real instances, variable-bound, no manual cleanup.

---

## Not now

Templates system, design-eye pixel diff, sync/drift tooling, HTML preview, React component mirror, Storybook, Code Connect, DECISIONS log, EXPERIMENTS harness, extra lint checks. Each returns only when a real screen fails without it.

---

## Status — 2026-10-06

First screen shipped end to end: `screens/projects-home.json` → `scripts/build.mjs` → `use_figma` → frame `14366:26931` on page `test`. 15 nodes, real local instances, variables bound, library text style applied. One build, one warning, zero manual fixes.

Facts learned:
- ES file = Enterprise Brain product file on top of ❖ Unify2026 library. Zero local variables; 332 colors + spacing/radius/widths/fonts all import by key (`ds/variable-keys.json`).
- 96 local components (nav / artefact / chat / meetings) + 12 Unify library entries catalogued in `ds/components.json`. Text layers are mostly named `Text`, so `text` overrides match by placeholder substring, not layer name.
- Agent cost per screen: ~1.5k tokens JSON + ~3.5k script passthrough.
- Naming gotcha: unsuffixed nav components are DARK; `* light mode` are light.

Second screen — replica of a reference screenshot (Agents list, expanded dark nav): `screens/agents-list.json` → frame `14393:28993`. 4 build iterations, each caught by screenshot diff against the reference. 40 ids, 5 catalog component types + 5 agent cards as primitives (no agent-card in catalog).

Schema/builder features added while replicating (all in `scripts/build.mjs`):
- `ops` on component nodes: `hide` (nested layer ids), `icons` (rotate nested icon instances), `set` (nested instance props) — needed because library nav composes everything in one instance.
- `@icon-key` as value of an INSTANCE_SWAP prop (button leading/trailing icons).
- Library sets import by `setKey` and variant-match on props (not just a fixed variantKey).
- `maxLines` (ellipsis), `wrap` + `rowGap` (flex-wrap grid), `abs` (absolute overlay, needs `why`), `replace` (rebuild a frame in place).
- Text overrides skip layers under hidden ancestors.

Gotchas found:
- FILL siblings with padding get unequal widths next to a bare spacer (basis includes padding). Use `wrap` + fixed `w` for card grids.
- `Text lg/*` styles are Spectral (serif) in this DS; `Text md/*`, `Text sm/*` are Geist. Placeholder/body text → md/sm.
- Avatar sizes: xs24 sm32 md40 lg48 xl56 2xl62. Agent_Avatar renders a green dotted tile, not per-agent artwork.
- Setting `textAutoResize` after `textTruncation` clears truncation — set truncation last.
- `use_figma` needs the whole script pasted (~6k tokens per iteration). If iterations get heavy, the Flaude plugin path (paste JSON into plugin) removes that.

Deviations vs reference screenshot (library limitations): nav agent avatars are colored squares not round art; no card shadow on search; card width 282 vs 282.67.

Speed (round 3): fetch is blocked in `use_figma`, but `new Function` works → runtime is installed once in a hidden `_es-runtime` page; each build call carries only screen JSON (~10k chars, one call incl. inline screenshot, was ~20k chars + separate screenshot). Live path: `scripts/serve.mjs` (watch + lint + compile) + generated Figma plugin `figma-plugin/` (polls localhost, rebuilds in place, tags frames with pluginData). Save file → frame updates, zero tokens. Plugin must be imported once: Figma desktop → Plugins → Development → Import plugin from manifest → `figma-plugin/manifest.json`.

HTML export (real website, round-trips to Figma):
- `scripts/tokens-css.mjs` → `ds/tokens.css`: CSS vars named after Figma variables (`--color-bg-primary`, `--spacing-2xl`, `--radius-3xl`) + `.ts-*` text-style classes.
- Figma is the layout engine. After each build the plugin runs `scripts/extract.js` over the built frame: auto-layout → flexbox, bound variables → `var(--token, fallback)`, text styles → `.ts-*` classes, icons/avatars → inline SVG, instances → `data-component` + `data-variant` (+ `data-c`/`data-p`/`data-i` from the screen JSON). Posted to `/dom/<name>`; `scripts/to-html.mjs` serializes (classes deduped) into `exports/<name>.html` with the compiled scene embedded in `<script id="es-scene">`.
- Round trip: drop an exported `.html` onto the plugin → it reads `#es-scene` → same builder → same frame. No pixels involved.
- Listing at `http://localhost:8787/` (live iframe previews, Open / Download / Send to Figma). Source tag: `built from Figma` vs `approximate` (JSON-only render until Figma has built it).
- Plugin sources (runtime + extractor) are fetched from the server, so edits need no plugin re-run.

Open:
- [ ] Which nav generation is current: `main-nav` (Nav Compos, 32px rows) or `main-nav-wip` (Sep 30, 28px rows)?
- [ ] `Text lg/Semibold` library style resolves to Spectral — intended for section titles, or DS inconsistency?
- [ ] Margins (`mt` etc.) accepted by lint, ignored by build. Decide: implement or drop from schema.
