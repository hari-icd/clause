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
- `ops.nodes` `align: right|center|left` right-aligns a text inside a component (sets textAlignHorizontal + parent MAX). Needed for table numeric columns.
- `ops.nodes` `has: "<text>"` selects the nearest instance that contains that text (hide/props it) — use when layer names repeat (menu items, list rows).
- Molecules exist for most "atom stacks": Split Button Brand (`split-button-brand`), Dropdown Menu (`dropdown-menu`). Check the catalog for *-menu / split-* before composing from atoms.
- `ops.nodes` `show: true` reveals a layer the component hides by default (e.g. a 5th menu item); text arrays then include it. Ops run BEFORE text overrides, so `has:` must match the component's original text.
- **Incremental rebuild**: top-level nodes whose JSON (plus catalog/runtime salt) is unchanged are moved from the previous frame instead of rebuilt (`es-hash` plugin data). Unchanged screen ≈ 60 ms; a content edit rebuilds only `main` (nav reused). Keep the nav / overlays as separate top-level children so they stay reusable.
- Per-instance layer index (`idx`) + font preload: ops/texts no longer walk the instance per op.
- Presence/stop: while Claude works the composer send button turns into ■ (Esc also stops); send icon is ↵. ⌄ collapse sits top-left (opposite ☰) and shrinks the window to just the two corner icons.
- Collapsed = ⌃ expand (left) + a bare three-dot status on the right, no container: dots wave in blue while Claude works or a build runs, sit still and grey when idle, red when the server is offline.
- Plugin window anchoring: `figma.ui.resize` keeps the top-left fixed, so collapse/expand pass `anchor:"br"` and code.js shifts the window with `figma.ui.reposition` — the bottom-right corner stays put wherever the user parked it.
- Builds never switch the user's Figma page: the screen is built on its target page in the background (page pin / existing page / current page) and the plugin shows a blue "Built <screen> on <page> — Go ›" nudge (bar when expanded, bouncing chevron when collapsed, 9 s). Only same-page builds zoom the viewport.
- **Layer naming:** component instances keep the component's own name (Buttons/Button Neutral, Routine card…) so the layers panel reads like the DS; frames/text are named by their JSON `i`. The JSON id of every instance is stored in plugin data `es-i`; annotation prompts list it as `target: <id> [layer "<name>"]`, and incremental reuse keys on it.
- **Failed builds never leave frames behind**: every frame a build creates is tracked (`es-root` plugin data + `CACHE.pending`); on failure they are removed (also inside Sections) and the previous frame regains its `es-screen` tag; at the start of the next build Clause-made untagged leftovers are swept. Do **not** loop build retries by hand: one attempt, read the error, fix the cause.
- Files whose library keys no longer resolve: the runtime falls back (a) to the default catalog's key (`alt`), (b) to the main component of an instance already on the target page (donor scan).
- `look.mjs pages|tree|snap|snaps` reads/screenshots whatever file the plugin is open in — no MCP link needed. `"section"` in a screen JSON builds inside a Section; `"ds": "ds/files/<name>"` selects another catalog.
