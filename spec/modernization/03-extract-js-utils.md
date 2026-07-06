# WP3 — Extract reusable JS utilities

**Goal:** stop copy-pasting interaction code. Extract two helpers that WP4–6 consume. No visible
behavior change in this WP — pure refactor + keep the nav CTA working.

## Do
1. **`initMagnetic(el, opts)`** from the anonymous "Magnetic Book Now" IIFE (~7282-7309). Signature:
   `initMagnetic(el, { maxX=12, maxY=7, pull=0.32, stiffness=0.16 })`. Keep BOTH gates verbatim:
   `prefers-reduced-motion: reduce` → no-op, and `(hover:hover) and (pointer:fine)` → no-op.
   Preserve the rAF spring (lerp toward target, stop when settled), the clamp, and writing
   `el.style.transform`. Re-point the nav CTA to call `initMagnetic(document.querySelector('.nav__cta a'))`.
   Compose-safe: expose an option or convention so callers whose element also uses a hover
   `transform` don't get clobbered (document the approach in a comment).
2. **`revealOnce(el, cb, opts)`** + `.reveal-stagger` CSS, from the reviews (6372-6426) / team
   (6428-6460) observers. One-shot (`io.disconnect()` after fire), `threshold` option (default .15),
   synchronous `cb()` fallback when `!('IntersectionObserver' in window)`. Provide a
   `.reveal-stagger > *` initial state (`opacity:0; transform:translateY(22px)`) + `.rv-in`
   end-state keyframe (reuse existing `rvSlideIn` if present) so callers just add a class +
   per-child `animation-delay`.

## Reuse
Existing `rvSlideIn` keyframe (~1938) and the count-up `countUp()` helper — do NOT duplicate; the
existing reviews/team count-ups should keep working (ideally re-pointed through `revealOnce`, but
at minimum untouched and functional).

## Constraints
Keep helpers in the existing inline `<script>` region unless a new file is clearly cleaner. No new
CDN deps. Reduced-motion + pointer gating must survive the refactor.

## Verify
Nav CTA still magnetically follows the cursor on desktop, inert on touch/reduced-motion. Reviews
and team count-ups still fire on scroll-in. Zero console errors. (No new UI yet.)
