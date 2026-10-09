# ES design rules

Short on purpose. Grows only from real screens that went wrong.

- Canvas 1440 wide. Left rail = `main-nav` (56px, collapsed). Content area fills the rest.
- Content padding: `3xl` (24) sides, `2xl` (20) top. Card-to-card gap `xl` (16). Inside cards `2xl`.
- Page background `bg-primary`. Cards `bg-primary` + `border-secondary`, radius `xl`.
- Breadcrumb row = `es-breadcrumb` at top of content. Page/section titles: Geist via `Text lg/Semibold`; Spectral (`Display *`) only for hero/identity moments.
- One brand-colored CTA per view (`button-brand`). Everything else `button-neutral`.
- Status/meta pills: reuse the nested `Pill squared` inside catalog components; don't hand-build pills.
- Copy: Title Case headings, sentence case body. Indian names, 2026 dates, USD costs. No lorem.
- Light mode. Dark-mode variants exist in the catalog (`*-light-mode` are the LIGHT ones — naming is inverted: unsuffixed = dark). Confirm which to use per screen.

## Copy and a11y checks (from Design plugin)
- CTAs start with a verb and name the outcome ("Create routine", not "Submit"). Same term for the same thing across screens.
- Empty state = what this is + why it's empty + how to start. Errors = what happened + why + how to fix.
- Confirmations name the action and the consequence; buttons are verbs ("Delete files" / "Keep files"), never OK/Cancel.
- Body text on its background needs 4.5:1 (large text 3:1). Prefer `text-primary`/`text-secondary` on `bg-primary`/`bg-secondary`; flag `text-tertiary`/`text-quaternary` on tinted fills.
- Clickable targets ≥ 44px tall where the DS component allows; icon-only buttons need a visible label elsewhere or a tooltip noted in the reply.

## Page specs (from senior-designer Meetings frame, 14667:35002)
- Content column 760 wide, centered in the main area. Top offset 60 (`6xl` + `lg`). Column gap `4xl` (32) between header, input, card, empty state.
- Page header row 44 tall, title + date control; date control = prev chevron, "Today 7 Oct" + caret, next chevron (32px icon buttons).
- Prompt input pill: 760×50, radius full, 9px inner padding, 32px icon buttons, placeholder `text-placeholder`.
- Promo/connect card: 760×158, 20px pad, copy column 436 wide (title 26, desc 2 lines), buttons 40 tall with 16px gap and 16px brand icons, icon tiles 63×63 with 18 gap on the right.
- Empty state: illustration 144×79 then 16px gap then 20px Spectral line, 152px below the last card.
- Nav: Meetings row selected; History section shows real rows ("New artifact" + time) under an `Agents` list.

## Settings / detail page pattern (senior ref 1504:416167)
- Project/detail page = `es-breadcrumb` (Variant "with Icon", Actions false) → `project-header` (title, subtitle, share, input; 760×216) → `horizontal-tabs` Default + icons (current tab via `nodes` props) → sections.
- Section = `form-header` Level 2 (hide `_Header icon` via `hideNames`) + `list-item-cardified` md (Icon simple, Actions + Action Buttons on, hide the 2nd action button; text via `ops` → Text sm/Regular text-secondary, maxLines 2) — never hand-built bordered cards. Gap md inside a section, 3xl between sections.
- Upload area = `add-source` (760×184), not a hand-built dropzone.
- Check the 172-component catalog and `list-item*` variants BEFORE composing card rows from primitives.

- Search bar = `input-field-outline` (Size lg, Type "Icon leading", Label/Hint off, Icon swap @icon-search-md, placeholder via `text` array). No dedicated search component exists.

## Standing preferences (from plugin feedback — apply without being asked)
- Menus: every row in a dropdown menu gets an icon, or none do. Never mixed.
- Overlays (menus, pickers) sit anchored under the control that opens them (⋯, split chevron), not floating elsewhere.
- Prefer molecules over atom stacks: `dropdown-menu`, `split-button-brand`, `list-item-cardified`, `routine-card`, `project-header`, `form-header`, `add-source`, `input-field-outline` (search). Check the catalog *and* the Routines/Chat pages for a local component before composing.
- Tables: right-align numeric/date columns (`ops align:right`), inset the table 12px, no fill on header cells (`bg:"none"`).
- Lists/rows of settings or options are `list-item-cardified`, not bordered primitives.
- Copy: B2B SaaS names (Acme Corp, SOC 2, Salesforce → HubSpot…), Indian owners, 2026 dates.
- Status in tables: `pill-squared` Pill Clear with dot colour (Success/Error/Gray) until the DS gets check/alert icons.
- Breadcrumb top bar: `bg:"none"`, cost pill hidden unless the screen is a chat.
- Avatars in card footers: xxs.
- Announcement/artifact previews use the `arifact-header` comp (hide extra toolbar groups via ops), not a hand-made header row.
- Toasts/overlays must not cover the header or primary content; place bottom-right inside the pane and keep the full width on canvas.
- Upload / drop zones use `file-upload-empty-state` (Size xl for a centred stack), never a hand-made dashed frame. Search the catalog by purpose words (upload, drop, paste, empty) before composing any region.
- Icon beside text (steps, rows, empty states) is always 16px: set `w:16,h:16` on standalone icon instances (default instance is 24).
- Publish confirmation is a popover under the Publish button (title, two key/value rows with chevrons, Cancel + Publish now), never a centred modal with a scrim (reference: Screenshots › 'Publish to home pages').
- Screens that show a hover or pointer interaction carry a `cursor` instance (State Arrow / Pointer Hand) at the pointer position, and the hovered element in its hover state. New states get a frame named `NEW · <number><letter> <state>` in a section `NEW STATES — <journey>`, built by cloning the neighbouring existing frame.
- Mobile frames are 360 wide with 20px side padding; stacked sections, type scaled (hero 36, section heading 30, body 18, eyebrow 14), header/CTA/footer come from the senior mobile reference, never re-drawn.
- If a cursor sits on a button or any interactive component, that component is shown in its Hover state (target it by the row it belongs to: `set` with `near`), and the hovered row/surface gets the hover fill.
- Rolling out a redesigned component to other screens: swap only the redesigned parts (head, foot…) by cloning the designer's new version; keep each screen's content, state and overlays, re-anchoring overlays to the new trigger.
- The user's manual edits in Figma after a build are the source of truth: before any change to a built screen, read the live frame first (`inspect.mjs <id>`, `look.mjs tree`) and apply the request on top of what is there. Never regenerate/replace from the JSON or generator over their edits; prefer in-place edits (swap.mjs, ops) and rebuild only if the live frame still matches the last build.
- Chat/ask inputs use the catalog `copilot-desktop-input-box` (Type Bottom small, Tools & Sources No, Attachment No, Inline Skills false), never a hand-built pill. The One-line variant shows ~27 characters and carries a ghost suggestion text (hide it with swap `hideTexts`).
- Plugin chrome: expand/shrink diagonal-arrows icon top-right (collapse), grey dot only when collapsed and idle (wave only while working), menu entries as labelled icons (Chats, Tools, Status) in a dock under the composer; the hamburger is gone.
