---
title: DS police
hint: Find parts that are not Unify 2026, swap tokens, outline foreign components in red
---
INTENT: the designer wants everything in a selection (or flow) to come from the Unify 2026 design system only. Fix what can be fixed (tokens), flag what cannot (components) with a red outline and links.

TARGET (first match wins): the attached selection (use the section/frame it names, else the selected frames' common parent), else the flow section the designer last worked in. Never ask unless nothing fits.

HOW (all deterministic, never by eye):
1. `node scripts/ds-police.mjs <nodeId> <fileKey>` writes `.clause/ds-police.js` (audit only). Read it and run it once with `use_figma` (skillNames figma-use). It returns: foreign components, mixed-token components, foreign variables found.
2. Foreign = bound to a variable outside the Unify 2026 collections (ds/variable-keys.json `_collections`). A component counts as foreign when at least half of the variables inside it are foreign (judged by its own tokens, never by name); fewer than half = "mixed", reported only.
3. Run again with the fix: `node scripts/ds-police.mjs <nodeId> <fileKey> --fix "<foreign variable names, comma separated>"`, read the file, run it. It swaps foreign variables on nodes outside instances to the Unify 2026 variable of the same name and adds a red outline (#FF000F, 2px, outside; the designer's exact colour, a deliberate raw value) on each outermost foreign component instance.
3b. VERIFY components before outlining: the variable test only nominates candidates. For each candidate, `search_design_system` (entity component, query = its name) lists every library that has a component of that name with its libraryName and set key; a candidate is foreign only when its set key belongs to a library other than "❖ Unify2026 Design System". Icons and small parts that Unify 2026 also publishes are NOT foreign: never outline them (m942: wrongly outlined zap, structure, shield, trash, Cursor, Small Icon Button).
3c. When the same component exists in Unify 2026 (same name, found in step 3b), do not just outline: swap each instance to the Unify 2026 set (`importComponentSetByKeyAsync`, pick the variant with identical variantProperties, `swapComponent`). Swapping resets text overrides, so re-apply labels/values afterwards and hide the help icon if it reappears; re-verify with a screenshot. Collect instances first, never iterate a list after swapping (nested nodes vanish).
4. Names with no Unify 2026 match come back as `noUnifyMatch`: list them, do not guess a substitute.
5. The script prints Figma links per component; give the designer the list (component name, uses, one link each; offer more on request).

NEVER: change anything inside an instance except the outline on the instance itself, delete or replace a component, touch frames outside the target.

FINISH: reply in 3-4 short lines: how many tokens were swapped, how many components are outlined (names + links), mixed ones to look at, anything unmatched. Jump chip to the target. Save new learnings to ds/design-rules.md.
