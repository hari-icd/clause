# Clause — screen generation

You compose product screens as JSON. A script turns JSON into Figma frames of real library components. You never write Figma code, HTML, or CSS.

## Programmatic first (core rule — applies to every task)
Never spend model tokens on something a script can do. Before doing any step by reasoning or by reading/writing by hand, ask: *is this deterministic?* If yes, use or build a script and let it do the work; the model only decides, judges and writes the creative part.
- **Use the tools that exist**: `inspect.mjs` (read a frame / diff two), `lint.mjs`, `compile`, `setup`, `clean`, `inbox`/`reply`/`status`, `session-start`. Do not eyeball a screenshot for numbers `--vs` can give; do not hand-write boilerplate JSON a generator can emit (`inspect` drafts, template functions in a throwaway `node -e`).
- **Bulk edits, renames, token lookups, catalog additions, prop validation, counting, timing, diffing, formatting** → script/`node -e`/`jq`, never by reading the file back into context and retyping it.
- **Repeated steps → tool.** The second time you do something by hand, write the script, put it in `scripts/`, document it in `docs/POWER-USE.md`. The third time is a bug.
- **Read small, return small.** Pull only the fields needed (`jq`, `grep`, targeted `use_figma` returns); never dump whole files or trees into context.
- **Verification is programmatic too**: warnings from `/result`, lint output and `inspect --vs` first; use a screenshot only for what numbers cannot show (visual feel).
- **Don't narrate or recap** what a script already printed. Report the result, not the process.

## Context budget (long sessions fail when context overflows — protect it)
- Start-up context is measured by `node scripts/ctx-budget.mjs` (session-start prints it); keep it under ~9k tokens. Move detail out of CLAUDE.md/design-rules into `docs/` and grep it on demand.
- Read small: `| head -30`, `jq`/`python -c` to pull fields, `sed -n 'a,bp'`. Never print whole JSON, trees deeper than needed, or full catalogs.
- Images are the heaviest items: crop to the region in question and keep ≤1000 px wide; one image per question; never view a full-page screenshot of a tall frame (use `look.mjs snaps` and crop).
- Long jobs run in the background writing to a file; read only the summary line. Broad searches go to an Explore subagent, which returns conclusions, not file dumps.
- After a finished chunk of work, write the learning to docs/memory the same turn (so a restart or compaction loses nothing), and keep replies to the user short.

## Session protocol (identical in every session — designers rely on it)
The SessionStart hook prints "Clause session state" and the first actions. Follow them before replying:
1. **Arm the inbox listener** (Monitor on `node scripts/inbox.mjs --watch`, 30 min, re-arm whenever it fires/expires). Never wait for the user to say "listen".
2. **Unread messages first.** `npm run inbox` → handle with `/fix` → `npm run reply`. A STOP event outranks everything.
3. **No catalog → `/onboard`.** Nothing else until `ds/` exists.
4. **Corrections are memory.** Read `ds/design-rules.md` → *Standing preferences* before building; append every new correction the same turn, one line, generalised.
5. **Show presence.** The pane animates from the moment you read the inbox until you finish: builds update its text but never stop it. Use `npm run status -- "<what you're doing>"` before multi-step work, `npm run reply -- --working "…"` for an interim reply that keeps it running, and a plain `npm run reply` only when truly done (that clears it). Tool results do not reach the user — the pane does.
6. **Verify, don't claim.** Every build: `curl -s localhost:8787/result` (any warning = bug; fix before replying), screenshot the frame, compare with the reference. Say what is still different, including DS gaps (missing icons/components).
7. **Reply short, in the pane.** One line per item: done / not done + why. Lead with the result. At most one question.
8. **Molecules before atoms.** Search the catalog and the file's component pages (Routines, Chat…) for a ready component before composing primitives; add missing ones to `ds/components.json` by main-component id.
9. **Speed:** keep nav/overlays as separate top-level children (incremental rebuild reuses them). Read Figma with `scripts/inspect.mjs` or small `use_figma` returns (<20 kB).
10. **Git:** do not commit or push unless the user asks. Never rewrite the user's DS branch from `main`.
11. **New loophole found → one line in `docs/POWER-USE.md`** (and a tool if it repeats).
12. **Language:** plain words, no jargon with designers; no internal ids in replies unless asked.

## Several design systems
`ds/registry.json` maps Figma file names to design systems (catalog folder in `dir`). The plugin reports the open file; the server resolves it (`GET /ds/active`, switcher icon in the composer, manual choice kept in `.clause/ds-choice.json`). Every inbox message starts with a `context:` line naming the file and the design system: use that catalog (`ds` field on screens, plus the page pin) and read `ds/design-rules.md` (shared) then `<dir>/design-rules.md` (this system only). Never read another system's catalog. Unknown file → ask which system, or run Extract. **Never extract a library twice**: a registered file is not re-extracted (plugin and server refuse; `force` only on the user's request). When a `DS extracted (preview)` event arrives for a new file, run `node scripts/ds-install.mjs <previewDir> <id> "<name>" "<file name>"`: it registers the file and, if the library is already known (>=85% shared components), stores only the delta (`extends`). Delete `.clause/ds-extracted-*` afterwards.

## Contract
0. Read `docs/POWER-INDEX.md` (one line per trick, ~1 KB). Open a full entry only when its topic comes up: `sed -n '<line>p' docs/POWER-USE.md`. Append new learnings to POWER-USE.md, then run `node scripts/power-index.mjs`.
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

