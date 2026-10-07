# Clause

Prompt or reference → developer-ready screens in Figma, built from your **real** design-system components and tokens. Zero style drift, ~2 s per rebuild, and a Figma plugin that lets you talk back to Claude without leaving the canvas.

Clause is a small control plane for Claude Code: you describe a screen (or point at a reference frame), Claude writes a JSON composition, a builder turns it into Figma frames made of real library instances with every spacing, color and text style bound to a variable or style. The same scene is exported as a real token-driven HTML page.

## How it works

```
you / reference frame ──▶ Claude ──▶ screens/<name>.json ──▶ live server ──▶ Clause Assist plugin ──▶ Figma frame
                                                            │                                    │
                                                            └──▶ exports/<name>.html ◀───────────┘  (real DOM, tokens as CSS vars)
```

- `ds/` is the only design-system-specific folder: component catalog, variable keys, token exports, design rules. Swap it to retarget another DS.
- `screens/*.json` is the whole spec. Node names are IDs, props use the Figma axis names, spacing/colors are token names. Lint rejects raw values without a reason.
- The plugin (**Clause Assist**) rebuilds on every save, exports HTML, and gives you a chat pane: select layers, write what should change, queue, send. Claude reads the inbox, edits the JSON, replies in the pane.

## Setup (once per machine, ~5 min)

Requirements: Node 18+, Figma desktop, [Claude Code](https://claude.com/claude-code).

```bash
git clone https://github.com/hari-icd/clause && cd clause
npm run setup
```

`setup` checks the machine, generates `figma-plugin/` and `ds/tokens.css`, lints the screens and prints the remaining manual steps:

1. Figma desktop → open your design-system file; enable its team libraries.
2. Plugins → Development → **Import plugin from manifest…** → `figma-plugin/manifest.json`.
3. `npm run live` (starts the server, opens the exports listing).
4. Plugins → Development → **Clause Assist → Start (silent)**. ⌘⌥P / Ctrl+Alt+P re-runs it later.
5. Open the folder in Claude Code.

### New design system

Run the plugin menu **Extract components & tokens** once. It walks every page and enabled library and writes `ds/components.json`, `ds/variable-keys.json`, `ds/tokens/*`, a starter `config.md` and `design-rules.md`. Claude audits the result automatically if the inbox listener is on (say "listen"). Sections to skip can be set in the plugin menu (⌥-click the item).

## Daily loop

| You | What happens |
|---|---|
| "build the meetings page" (+ screenshot or Figma URL) | Claude drafts from the reference (`npm run inspect <url>`), writes `screens/meetings.json`, the frame appears in Figma, screenshot comes back |
| Select layers in Figma, type "use list-item here", ⏎ | Queued in the plugin pane with node ids, component, props, path |
| **Send all** (or ⌘⏎ for send now) | Claude picks it up (`npm run inbox`), edits the JSON, rebuilds, replies in the pane with ✓✓ |
| `npm run inspect <ref> --vs <mine>` | Numeric diff of your build vs a reference frame (w/h/gap/pad/radius/props) |

Say **"listen"** in Claude Code to have it wake on each send instead of you typing "check the inbox". Idle cost is zero.

## Commands

| | |
|---|---|
| `npm run setup` | machine check + generate plugin and tokens |
| `npm run live` | server + listing + plugin rebuild |
| `npm run inspect <url\|nodeId> [--vs <id>] [--raw]` | reference frame → draft JSON / diff / layer dump |
| `npm run inbox` / `npm run reply -- "…"` / `npm run status -- "…"` | what Claude uses to read, answer and show presence in the pane |
| `npm run clean [--all]` | remove local history, drafts, stale exports (and generated files with `--all`) |

## Repo map

```
CLAUDE.md          contract Claude follows (read this to understand the rules)
docs/POWER-USE.md  tricks that keep the loop fast — grows as we find loopholes
ds/                design-system catalog + tokens + rules   ← swap point
screens/           screen compositions (JSON)
scripts/           server, compiler, lint, builder runtime, plugin generator, tools
scripts/plugin/    the plugin's own pieces (UI, annotate, extract)
figma-plugin/      generated — import this manifest into Figma
exports/           generated HTML + meta.json (gitignored)
.clause/           local chat history (gitignored)
```

## Principles

- **Constrain the surface, not the intelligence.** The agent can only reach real components and real tokens; primitives are allowed but labelled with a `why`.
- **Discipline lives in the repo, not the session.** A fresh Claude session reads `CLAUDE.md` + `ds/` and produces the same output.
- **Never refuse, always label.** No component for a pattern? Build it as a recorded primitive, say so, move on. Catalog grows from real screens, not from documenting a whole DS up front.
- **Every loophole gets logged** (`docs/POWER-USE.md`) and, where possible, turned into a tool.

`main` is design-system agnostic: `ds/` ships empty and is filled by **Extract components & tokens**. Teams keep their own DS on a private branch.
