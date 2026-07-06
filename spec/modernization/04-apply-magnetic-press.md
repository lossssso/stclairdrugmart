# WP4 — Apply magnetic (desktop) + press (touch) to the CTA set

**Goal:** premium tactile CTAs across the page using WP3's `initMagnetic`. Touch is already
covered by WP2 press states.

## Do
Call `initMagnetic()` on (fine-pointer desktop only — the util self-gates):
`.pa-card` (the two primary booking cards), `.shop__card`, `.reviews-google-btn`,
`.reviews-uber-btn`, `.reviews-read-btn`, and `.contact-float__toggle` (FAB).
Tune per-target strength (cards subtler: `maxX~8,maxY~5`; pill buttons `~12,7`).

## Constraints (hard)
Do NOT magnetize anything inside the PharmAssess booking iframe/`.pa-iframe-wrap`, the
drug-checker input/results, or self-assessment forms. Magnetism is on the entry CTAs only, never
the tools. Ensure compose-safety with WP2 hover-scale (put translate on element, scale on
hover/active) so the two don't overwrite each other's `transform`.

## Reuse
`initMagnetic` (WP3). Press states (WP2). No new code beyond call sites + minor compose fix.

## Verify
Desktop: listed CTAs drift toward the cursor and spring back; nothing inside forms/iframe moves.
Touch: press states only, no drift. Reduced-motion: no drift. 375 + 1280. Links still work.
