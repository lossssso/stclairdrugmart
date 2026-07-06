# WP8 — Emoji → stroked-teal SVG iconography

**Goal:** the single biggest "AI → clinical-professional" jump. Replace the pervasive emoji icon
system with a consistent inline-SVG set in brand teal, matching the SVG style the hero already
uses (~2828-2844). Large surface — stage in sub-batches, each its own commit + push.

## Batches (commit per batch)
1. **Welcome**: `.welcome-box__icon` (6 boxes), `.welcome__pill` (10 pills), welcome-modal tags/badge.
2. **Services/ailments**: `.pa-card__icon`, `.pa-row-heading__icon`, the dozens of
   `.ailment-card__icon`, `.ailments-triage__btn` icons, and the `AILMENT_DB` icon field in JS
   (~6473+) that feeds them.
3. **Rest**: `.reviews-metric__icon`, hero status glyphs, any remaining emoji.

## How
Inline `<svg>` (stroked, `currentColor` or brand teal, ~1.5 stroke), sized via the existing icon
classes. Prefer a small shared symbol set (`<symbol>` + `<use>`, or a JS icon map for the
JS-generated ailment cards) so it's maintainable, not 60 hand-inlined blobs. Keep the emoji as an
`aria-label`/visually-hidden fallback where it aids a screenreader; mark decorative SVGs
`aria-hidden="true"`.

## Constraints
No palette change (teal + ink only). Icons must stay crisp at 375px. Don't change layout/box
sizes — swap the glyph, keep the container. The JS-generated ailment cards need the icon map
updated in the data source, not just the DOM.

## Verify
Each batch: icons render in teal, aligned, crisp on mobile; screenreader still announces the
item; no emoji left in that batch's surface; JS-generated cards show SVGs. 375 + 1280 per batch.
