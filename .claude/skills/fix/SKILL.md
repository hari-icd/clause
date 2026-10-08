---
name: fix
description: Apply messages and annotations sent from the Clause Assist Figma plugin. Use when the user says "check the inbox", "fix the notes", "see what I sent", or asks to apply Figma annotations.
---

# /fix — work the Clause inbox

1. `npm run inbox` (needs `npm run live` running). Each message is either free text or an **annotations batch** (numbered items with screen, node id, name, type/component, path, props/text/layout).
2. For each item: the node **name** is the screen JSON `i` id in `screens/<screen>.json`; layers inside a component instance are edited with `ops` (`nodes` → `hide`/`props`/`style`/`color`/`maxLines`/`swap`). Never hand-edit Figma. If the item is vague, run `node scripts/inspect.mjs <nodeId> --raw` first; with a reference frame, `--vs`.
2b. Any correction the user gives that could apply again ("use X instead of Y", "always…", "this is misplaced") goes into `ds/design-rules.md` → **Standing preferences** the same turn, in one line. Read that section before building anything.
3. Before any multi-step investigation, `npm run status -- "<what you are doing>"` so the pane shows it. Edit the JSON (hook lints). Catalog components/variants over primitives; props by exact axis name.
4. Save → live rebuild. Read `curl -s localhost:8787/result`: any warning is a bug. Re-inspect the changed node / `get_screenshot` the frame.
5. `npm run reply -- "…"` with one line per item: done / not done + why. Keep it short — it renders in a 300px panel.

## System events (kind: system)
- **DS extracted**: audit `ds/components.json` + `ds/variable-keys.json`: duplicate/odd keys, icons without `icon-` prefix, missing `bg-primary` / `text-primary` / `border-secondary` aliases (the builder's defaults), text styles whose font differs from the body font (note the families in `ds/design-rules.md`), library components with no texts. Fix what is mechanical (rename keys in the JSON), note the rest in `ds/design-rules.md`, then `npm run reply` with 2–3 lines + "build first: <screen>" suggestion. Don't dump lists in the pane.
- **STOP** (title "STOP"): the user pressed Stop in the plugin. Abandon the current task immediately — no further edits or rebuilds — make sure the last saved screen JSON lints, then `npm run reply -- "Stopped at: <one line>"`. Do not resume unless asked.
