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
