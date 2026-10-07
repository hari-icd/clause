# ds/ — the design-system swap point

Everything Clause knows about *your* design system lives here. Nothing else in the repo is DS-specific.

| file | written by | purpose |
|---|---|---|
| `components.json` | plugin → **Extract components & tokens** | local + library components: keys, variant axes, defaults, placeholder texts |
| `variable-keys.json` | extract | spacing / radius / width / color aliases / text styles → Figma keys |
| `tokens/variables.json`, `tokens/text-styles.json` | extract | raw exports (values, aliases) used to generate `tokens.css` |
| `tokens.css` | `npm run tokens` (generated, gitignored) | CSS custom properties for the HTML exports |
| `config.md` | extract (starter) → you | file key, canvas page, libraries, sections to ignore |
| `design-rules.md` | you + Claude | short numeric rules learned from real screens |

First run: open your DS file in Figma, start Clause Assist, menu → **Extract components & tokens**. Then review `config.md` (canvas page) and let Claude audit the catalog.
