# Clause

Describe a screen (or point at a reference) → it appears in Figma, built from your **real** design-system components with every spacing, colour and text style bound to a variable. Then annotate it in Figma and send the notes to Claude from inside the file. No code, no CSS, no manual cleanup.

Works for designers who have never opened a terminal. Claude does the setup; you do four clicks in Figma.

---

## Start here (10 minutes, once per computer)

### Part A — install two apps (you)

1. **Figma desktop app** — https://www.figma.com/downloads/ (the browser version cannot run developer plugins).
2. **Claude Code** — https://claude.com/claude-code. Install and sign in.

### Part B — open Clause in Claude Code (you)

3. Open Claude Code → **Open folder** → pick this folder. (No folder yet? Paste `https://github.com/hari-icd/clause` into Claude Code and ask it to clone it for you.)
4. In the chat, type exactly:

   ```
   set me up
   ```

### Part C — Claude takes over

Claude checks the computer, starts Clause's local server, and tells you the only two things it cannot click for you:

5. **Import the plugin into Figma** (once): Figma menu → *Plugins* → *Development* → *Import plugin from manifest…* → choose `figma-plugin/manifest.json` inside this folder.
6. **Open your design-system file in Figma** and run *Plugins* → *Development* → **Clause Assist** → *Open Clause Assist*.

Claude sees the plugin connect, starts **Extract components & tokens** in it (1–3 min, progress shows in the plugin pane), reads the result, and replies in the pane with what it found and what to build first.

That is the whole setup. From now on you talk to Claude from the plugin pane or from Claude Code — whichever is open.

> Something failed? Tell Claude Code: **"setup failed, here is what I see: …"** and paste the message. Claude fixes it or tells you the one thing to click.

---

## Every day

| You want | Do this | What happens |
|---|---|---|
| A new screen | Tell Claude (either chat): *"build the meetings page"* — add a screenshot or a Figma link of a reference if you have one | Claude drafts the screen, it appears on the Figma page you are on, Claude shows you a screenshot |
| Change something | In Figma, select the layer(s), type in the plugin pane what should change, press **⏎** | Claude edits, the frame rebuilds in place (~1 s), the pane shows ✓ sent → ✓✓ read → reply |
| Several changes at once | Type each, press **⌘⏎** to queue; press **⏎** when done | They go as one batch |
| Ask anything | Type without selecting layers | Plain message to Claude |
| Stop Claude mid-task | Press **■ Stop** next to its "working…" bubble | Claude drops the task and replies with where it stopped |
| Claude reacting without being prompted | Say **"listen"** in Claude Code | Claude wakes on every send from the plugin (costs nothing while idle) |
| A real web page of a screen | ☰ → *Open listing page* | Every screen as token-driven HTML; drop a page back onto the plugin to rebuild it |

Good references make good screens: a screenshot of the real product, or a frame a senior designer built. Claude reads exact spacing and components from a Figma frame, so a Figma link beats a screenshot.

---

## Switching to another design system

Open that design-system file in Figma and run **Clause Assist → Extract components & tokens** (or tell Claude "new design system"). Claude rebuilds the catalog and tells you what changed. Nothing else to configure. Keep each team's catalog on its own git branch (`main` carries no design system; this team's lives on `es`).

---

## For Claude (and curious humans)

- **Contract**: `CLAUDE.md`. Schema: `docs/SCHEMA.md`. Speed tricks and loopholes: `docs/POWER-USE.md`.
- **Skills**: `/onboard` (the setup above), `/screen` (build from brief/reference), `/fix` (apply plugin messages).
- **Pipeline**: `screens/<name>.json` → `scripts/compile-core.mjs` (validates against `ds/`) → `scripts/serve.mjs` (watch, SSE, HTML export, message store) → `figma-plugin/` (builder runtime inside Figma) → frame.
- **Commands**: `npm run setup` · `npm run live` · `npm run inspect <url|id> [--vs <id>] [--raw]` · `npm run inbox` / `npm run reply -- "…"` / `npm run status -- "…"` · `npm run clean [--all]`.
- Node 18+, zero npm dependencies. Local-only state: `.clause/` (chat history), `exports/`, `ds/tokens.css`.

### Principles
Constrain the surface, not the intelligence · discipline lives in the repo, not the session · never refuse, always label (primitives carry a `why`) · every loophole gets logged and tooled.
