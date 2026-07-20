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
- The six homepages + portal inline a `<style id="critical-css">` block (above-the-fold rules extracted from site.css) and load site.css async via preload/onload. After meaningful site.css changes, regenerate that block on all seven pages (headless extraction harness; keep the block byte-identical across the six homepages so the skeleton diff passes). Fonts are self-hosted in `/fonts/` (declared in site.css, blog/post.css, and /fonts.css); never re-add Google Fonts links.

## Duplicated content blocks (STANDING RULE)
The 28-condition minor-ailment cards exist **twice on every homepage, on purpose** (owner decision, July 2026):
1. Booking section: inside `#conditions-panel` (`data-triage-scope="portal"`, sections classed `portal-cat`).
2. Services accordion: inside `#acc-ailments` (`data-triage-scope="main"`, sections classed `main-cat`).

**Any add/edit/removal of an ailment card must be applied to BOTH copies**, and (per the mirror rule above) on index.html AND all five language pages: 12 copies total. The two copies deliberately differ slightly in description length (accordion versions are longer); keep each copy's style. The same cards also live on `portal/index.html` (English only), which is a copy of the booking section: update it too when the booking-section copy changes.

## Copy rules
- No em-dashes anywhere in site copy.
- Spanish/Portuguese/Turkish use formal address; Italian informal; French is fr-CA idiom (sans rendez-vous, feux sauvages, zona).
- Headings use sentence case in es/fr/pt/it/tr (no English-style Title Case).
- The brand name "St. Clair Drug Mart Pharmacy" keeps `lang="en"` on uppercase-transformed elements of the Turkish page (prevents dotted İ).

## Git
- Committer must be `Claude <noreply@anthropic.com>`.
- Never push without explicit owner approval — a push deploys the live site via Cloudflare.
