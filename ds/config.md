# ES DS — Config

## Identity
- **Product**: Enterprise Brain (EB / "ES"), by UnifyApps. Internal assistant: "Atlas".
- **Design system**: ❖ Unify2026 Design System (team library) + local product components in this file.
- **Owner**: ICD (Itu Chaudhari Design). Figma MCP authed as jatin@icdindia.com (full seat: ICD, UnifyApps teams).

## Figma
- **File (library + canvas, same file)**: https://www.figma.com/design/lqKjNjyifEXCeywg69Knr2/Enterprise-Brain-Base-2026---1
  - File key: `lqKjNjyifEXCeywg69Knr2`
  - Pages: `10773:588882` 📦 Components (local components) · `1707:115989` Chat + Artifacts · `563:116774` Projects + Chat History · `14357:26931` **test** (canvas — all generated frames land here)
  - Components page sections to READ: Nav Compos, Nav-Desktop App- Sep 30 WIP, Artefact Comps, Chat Comps, Meetings + Settings
  - Sections to IGNORE: Claude screenshots, Widget Customization - Homepage
- **Linked libraries**: ❖ Unify2026 Design System (`lk-bbf9a611…`), ❖ All Company Logos (`lk-19a0c598…`)
- **Unify2026 DS source file** (read-only reference): `qT9zH1YYapGTwpJxwNEGzt`

## Variables
- Zero local variables. All bind to Unify2026 library collections (import by key):

| Collection | Key | Count |
|---|---|---|
| 1. Colors | `58acf14254246c2c18cd9fd3600d81b12fd22d6e` | 332 |
| 2. Radius | `e0cd11f1c4a01a0e5f01456e550b7ea6c23eb0fc` | 11 |
| 3. Spacing | `13a6d069e108695e3f358a7806bf43673f365bc3` | 17 |
| 4. Widths | `1d3efa139bc2cfd344e9ab9b8a244f05810b3811` | 12 |
| 5. Containers | `c7dcfc3158a3428c405281f3ea06bfc6abafef1d` | 3 |
| 6. Fonts | `9772a8221e2b260f3b713a5d60f8cec1e3c3c557` | 3 |

- Variable name → key map: `ds/variable-keys.json` (generated). Values: `ds/tokens/variables.json` (Flaude export of same DS; `_resolver.sh` for lookups).

## Fonts
Geist (body), Spectral (display), JetBrains Mono (code). Verify styles via `listAvailableFontsAsync` before first text write.

## Defaults
- Breakpoint 1440 × 900 (local full-page components are 1440×900).
- Light mode. Local nav components exist in dark ("default") and "light mode" variants — mode choice TBD per screen.
- Two nav generations: "Nav Compos" (32px rows) and "Nav-Desktop App- Sep 30 WIP" (28px rows). Current = TBD (ask).
