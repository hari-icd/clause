---
name: screen
description: Create a product screen in Figma from a brief, reference image, or Figma URL. Use when the user asks for a screen, page, state, or flow.
---

# /screen

1. Read `ds/components.json` keys + `ds/design-rules.md` (skip if already in context this session).
2. Pick a kebab name. List regions of the screen; for each, name the catalog component. Where none fits, note the primitive and why. Keep this list for the reply — do not write a separate file.
3. Write `screens/<name>.json`. Multi-state → `"screens": [{"name","tree"}]`.
4. Hook lints. Fix until clean.
5. Save = build (live server + plugin). `curl -s localhost:8787/result` → root id + warnings; any warning is a bug.
6. `get_screenshot` on each root id (maxDimension 1600).
7. Review (no extra Figma calls): run the `design:design-critique` lens on the screenshot — hierarchy, consistency vs reference, copy per `ds/design-rules.md` "Copy and a11y checks", contrast. List only real findings; fix cheap ones via `replace` rebuild.
8. Reply: frame id(s) + screenshot, components used, primitives + why, warnings, one open question max.

Cost discipline: one catalog read (+ `inspect.mjs` draft if a reference frame exists), one JSON write, one screenshot. No exploratory Figma reads.
