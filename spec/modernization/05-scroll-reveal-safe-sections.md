# WP5 — Scroll-reveal & stagger on SAFE sections

**Goal:** sections gently assemble as they enter — the "engaging on scroll" ask, delivered where
it can't hurt reading or conversion.

## Do
Using WP3's `revealOnce` + `.reveal-stagger`: staggered entrance (opacity 0→1, translateY 22→0,
~0.08–0.1s per child) for:
`.welcome__boxes`, `.services__grid`, `.staff-grid` (team), the `.blog-card` list,
and `.new-patients .step` cards.

## Constraints (hard)
- Reveal is ADDITIVE (`.rv-in` applied by JS). Content must be fully visible by default in the
  stylesheet — NEVER bake `opacity:0` into the base rule (crawler/no-JS/reduced-motion safe).
- One-shot per element; disconnect after firing.
- Reduced-motion: show final state instantly, no transition.
- Explicitly SKIP: FAQ answers, drug-checker, booking iframe, contact map + live status board,
  self-assessment. No reveals there.

## Reuse
`revealOnce` (WP3), existing `rvSlideIn` keyframe.

## Verify
Scroll each section into view → cards stagger in once. Reload with JS disabled → all cards present.
Reduced-motion → instant, no motion. 375 + 1280. No CLS (reserve space; cards occupy layout even
at opacity 0-equivalent — but since base is visible, this is inherently safe).
