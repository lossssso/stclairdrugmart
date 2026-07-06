# WP6 — Card tilt with depth (desktop) + touch branch

**Goal:** the "3D interactive" ask, tastefully — cards gain a subtle pointer-driven tilt with
real depth, and a genuine touch equivalent.

## Do
Desktop (fine-pointer only): on `.welcome-box`, `.pa-card`, `.shop__card`, `.staff-card` add a
mouse-move `rotateX/rotateY` (MAX ~4–6°), `perspective` on the parent/grid, a slight lift, and
`will-change: transform` toggled on enter and removed on leave. Small rAF-eased spring back to
flat on mouseleave. Package as an `initTilt(el, {max=5})` helper alongside WP3's utils.

Touch branch (choose the calmer of):
- (a) scroll-position-driven micro-tilt (map viewport position → tiny rotateX), reusing the
  about-seq rAF+delta-throttle pattern (~7431-7441); OR
- (b) if scroll-tilt reads janky on low-end, fall back to WP2 press + WP5 reveal only (no tilt).
Decide by testing; record the choice in PROGRESS.md.

## Constraints (hard)
Reduced-motion → no tilt at all. Never tilt cards that embed/scroll a tool. Keep max angle small
(clinical, not gimmicky). Compose with any magnetic translate already on the element (tilt uses
rotate, magnetic uses translate — combine in one transform string, don't overwrite).

## Verify
Desktop hover: gentle tilt toward cursor, springs flat on leave, no jitter, `will-change` removed
after. Touch: chosen branch smooth or absent. Reduced-motion: flat. 375 + 1280. 60fps on a
throttled CPU profile (spot check).
