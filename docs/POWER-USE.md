# Clause — power-use notes

Living list of the tricks that make the loop fast. Every time we find a loophole that saves clicks, tokens or rounds, it goes here *and* into the tooling, so it survives new sessions and new machines. (Claude: read this at session start; add to it whenever a new trick lands.)

## The loop
- `npm run live` once. Save a screen JSON → Figma frame rebuilds in ~1–3s, HTML export follows. No tool calls to "build".
- Plugin **Start (silent)** stays hidden; ⌘⌥P (Ctrl+Alt+P) reruns the last plugin after any plugin change.

## Talking to Claude from Figma (costs nothing while idle)
- One chat pane. **◎ annotate** on → the Figma selection rides along as chips (multi-select OK; one comment covers all; prompt carries node id, component, props, path, screen). ⏎ queue · ⌘⏎ send now. Queue widget: hover an item for send/discard; header icons send/discard all. History is local (`.clause/history.json`), never in the Figma file.
- ⚙ in the header: build status, drop an HTML export to rebuild it, exports listing.
- **Listener**: say "listen" → Claude arms `npm run inbox -- --watch` (a blocked node process, zero tokens while idle; one normal turn when something arrives; expires after 30 min with one tiny notice). Without it, say "check ib".
- Claude answers with `npm run reply -- "…"` → shows in the Messages tab.

## Reading Figma without burning context
- `node scripts/inspect.mjs <url|nodeId>` → `drafts/<id>.json` skeleton of ANY frame (senior designer work included): catalog keys, non-default props, texts, token-mapped spacing. Start reference screens from this, never from scratch.
- `--vs <mine>` → numeric diff (w/h/gap/pad/radius/props) instead of eyeballing screenshots. `--raw` for layer names inside instances (needed for `ops`).
- `use_figma` reads truncate above ~20 kB — prefer inspect.mjs; if you must, return only ids/names.
- `get_screenshot` on the root frame (maxDimension ≤1200) is the cheapest visual check; never screenshot the page.

## Builder loopholes (runtime.js)
- `ops.nodes` reaches anything inside an instance by layer name + nth: `hide`, `icon`/`swap` (`@icon-key`), `props` (nested variant props, e.g. tab `Current`), `style` + `color` (restyle a text inside a component), `maxLines`, `tint`.
- Readback warnings: `prop not applied …` and `variant not matched …` — a warning is a bug, never ignore.
- `bg: "none"` on any node (instances too) clears its fill — the only way to strip a component's background.
- Instances can't be dashed/outlined differently; need a plain frame for that (record `why`).
- Big library sets import slowly once (~2 min for copilot-input-box), then cached per plugin session.

## New design system
- Plugin ⚙ → **Extract components & tokens** (or the menu item): walks every page + enabled libraries → `ds/components.json`, `variable-keys.json`, `tokens/*`, `tokens.css`, a starter `config.md`. With an existing catalog it writes a preview under `.clause/` and Claude (listener on) compares and recommends the merge. One click replaces the day of manual harvesting.

## Catalog growth
- A component the catalog lacks → add it by main component id (`project-header` was added this way in 2 lines). Prefer `list-item*`, `form-header`, `add-source`, `container`, `featured-icon` over primitives.
- Page-level specs learned from senior frames live in `ds/design-rules.md` (Meetings, Settings pattern). Add one block per new pattern.

## Hygiene
- `npm run clean` wipes `.clause/`, drafts, out, stale exports; `--all` also regenerated files. `npm run setup` on a new machine.
- Nothing in the repo depends on npm packages; Node 18+ only.
