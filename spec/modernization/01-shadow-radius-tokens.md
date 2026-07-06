# WP1 — Shadow & radius token consolidation

**Goal:** kill the "ad-hoc shadow" AI-tell. Route every card/button family onto the two layered
tokens `--shadow-card` / `--shadow-hover`, and impose a 2-tier radius scale. Pure CSS, no JS, no
layout change — the safest possible first pass.

## Do
1. Replace flat/bespoke shadows with `var(--shadow-card)` resting + `var(--shadow-hover)` hover on:
   `.shop__card`, `.info-strip__card`, `.reviews-google-badge`/`.reviews-uber-badge`,
   `.reviews-google-btn`/`.reviews-uber-btn`/`.reviews-read-btn`, `.vaccine-card`,
   `.medscheck-card`, `.blog-card`, `.step`, dropdown, nav-cta, welcome-modal.
2. `.pa-card`: move its bespoke double-shadow onto the token; fix off-palette ink `13,45,46` →
   `0,45,49` (matches the token's ink) wherever it appears in that block.
3. **Bug fix:** `.reviews-metric:hover` is declared twice — the token-based rule is dead,
   overridden by a later flat `0 8px 28px rgba(0,80,90,.13)` rule. Delete the flat duplicate; keep
   the `--shadow-hover` + `translateY(-2px)` rule.
4. Radius: adopt 2 tiers — pill CTAs = `100px`, card-buttons/cards = `var(--radius)` (14px). Fix
   the outliers (`.btn` 6px, `.nav__cta` 7px) toward the scale; leave genuine pills at 100px.

## Reuse / don't reinvent
`--shadow-card`, `--shadow-hover`, `--radius` already defined in `:root`. Do not invent new tokens.

## Constraints
No hue changes. No markup changes. `box-shadow` is fine to *set* statically (it's not animated
here) but hover transitions stay on `transform`/`box-shadow` as they already are.

## Verify
375px + 1280px screenshots before/after — cards look deeper and consistent, nothing shifts
position, review-metric hover now actually lifts. Zero console errors.
