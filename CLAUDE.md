# St. Clair Drug Mart — repo rules

## Language pages are full mirrors (STANDING RULE)
`/es/`, `/fr/`, `/pt/`, `/it/`, `/tr/` are complete translated copies of `index.html` with an identical DOM skeleton. **Any change to index.html — content, sections, review counts, schema, markup — must also be applied to all five language pages** (translated where user-facing). Never change English alone.

- Only text nodes and these attributes may differ from English: `alt, title, aria-label, placeholder, content, lang, aria-current, data-name, label, value, data-base` (plus the two `class="lang-note"` paragraphs each page carries).
- `data-label` and `data-hint` attributes stay **English** (GA event aggregation + they describe the English PharmAssess UI).
- After any structural edit, verify all five pages against index.html with the DOM-skeleton diff harness — it must report STRUCTURE IDENTICAL.

## Shared assets
- All CSS lives in `/site.css`, all behaviour in `/site.js`; pages reference them with a `?v=N` cache-buster. Bump `N` on every site.css/site.js change, on **all six homepages** in the same commit.
- Per-page inline data blocks (`window.FAQS`, `window.AILMENT_DB`, `window.SITE_INDEX_CORE`, `window.I18N`) carry each language's translations; site.js falls back to English when `window.I18N` is absent.
- After editing a page's `window.FAQS`, regenerate its `#faq-schema-static` JSON-LD block from the translated data.

## Copy rules
- No em-dashes anywhere in site copy.
- Spanish/Portuguese/Turkish use formal address; Italian informal; French is fr-CA idiom (sans rendez-vous, feux sauvages, zona).
- Headings use sentence case in es/fr/pt/it/tr (no English-style Title Case).
- The brand name "St. Clair Drug Mart Pharmacy" keeps `lang="en"` on uppercase-transformed elements of the Turkish page (prevents dotted İ).

## Git
- Committer must be `Claude <noreply@anthropic.com>`.
- Never push without explicit owner approval — a push deploys the live site via Cloudflare.
