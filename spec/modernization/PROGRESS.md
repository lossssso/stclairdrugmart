# Modernization — Progress Tracker

Base branch: `dev` (work branch tracks `origin/dev`). Palette LOCKED to 4 brand teals + white/ink.
Full rationale + audits live in each `NN-*.md` spec file. Implement in order; one commit + one
push per WP (never batch); verify at 375px + 1280px before the next.

## Already-wired dependencies (what a future session can assume exists)
- **Design tokens** (index.html `:root` ~146-169): `--teal-dark #00737c`, `--teal-bright #21a1a8`,
  `--teal-mid #5cb9bc`, `--teal-ice #d7fbfc`, `--shadow-card`, `--shadow-hover`, `--ease-apple`
  (`cubic-bezier(.25,.1,.25,1)`), `--ease-spring` (`cubic-bezier(.175,.885,.32,1.275)`),
  `--radius 14px`. Fonts: Plus Jakarta Sans (display) / DM Sans (body), loaded ~142.
- **Vendored 3D/anim** in `vendor/`: `three.core.min.js` (376 KB), `three.module.min.js` (357 KB),
  `gsap.min.js` (71 KB), `ScrollTrigger.min.js` (43.5 KB). Loaded LAZILY + capability-gated by
  `walkin3d.js` (the welcome WebGL store tour) — never eagerly, never on weak/reduced-motion.
- **walkin3d.js** — welcome-section Three.js scroll walk-in. Mounts into `<canvas id="w3d-canvas">`
  inside `.w3d__stage`; sets `html.w3d-on` when active (hides classic pills). Well-gated
  (hardwareConcurrency<=2 / deviceMemory<=2 / no-WebGL / reduced-motion / lite-clouds all bail)
  with a 2-stage FPS watchdog. KNOWN GAPS (WP9): no `webglcontextlost` fallback; no tab-hidden pause.
- **About scroll-sequence** — vanilla 2D-canvas crossfade of the 6 gallery photos, no library,
  at index.html ~7372-7482 (`#abt-seq-canvas`, `html.abtseq-on`). This is the CLAUDE-preferred
  "canvas image-sequence" technique — reference implementation for any future 3D down-convert.
- **Reusable interaction seeds** (WP3 generalizes these): magnetic nav CTA IIFE ~7282-7309;
  IntersectionObserver count-up + `.rv-in` stagger reveal ~6372-6426 (reviews) and ~6428-6460 (team).
- **`.btn` tactile recipe** ~702-718: spring hover `translateY(-2px) scale(1.03)` + layered hover
  shadow + `:active scale(.97)` — the button gold standard to propagate.

> Line numbers are from `origin/dev` at session start (index.html ~7,485 lines) and WILL drift as
> WPs land. Always `grep` the selector/keyword before editing; never trust a raw line number.

## Status
| WP | File | Status | Notes |
|----|------|--------|-------|
| — | scaffolding | Done | this folder + tracker (commit c8ca4d9) |
| 1 | 01-shadow-radius-tokens.md | Done | commit bfc21d5 — see notes below |
| 2 | 02-tactile-button-system.md | Done | commit 8b015cb — press states + nav CTA pill |
| 3 | 03-extract-js-utils.md | Done | commit c74b79d — 3 globals + .reveal-ready recipe |
| 4 | 04-apply-magnetic-press.md | Not Started | depends on WP2, WP3 |
| 5 | 05-scroll-reveal-safe-sections.md | Done | commit cdcc09e — see notes + deviation below |
| 6 | 06-card-tilt-touch.md | Not Started | depends on WP3 |
| 7 | 07-section-rhythm-focal-depth.md | Not Started | after mechanical passes |
| 8 | 08-emoji-to-svg-icons.md | Not Started | large; sub-batched commits |
| 9 | 09-welcome-3d-guardrails.md | Not Started | walkin3d.js compliance |

## Decision log
- (session start) Palette ban on Three.js was lifted on `dev` → graduated perf-gated 3D rule;
  canvas image-sequence preferred over WebGL engine. Welcome hero uses WebGL (walkin3d.js);
  flagged for possible future canvas-sequence down-convert (separate approval, NOT in these WPs).
- Motion scope = CURATED: modernize everything, heavy scroll-3D only where safe; forms/tools/map
  get polish + entrance reveals, never scroll-motion on the tool itself.
- Touch = first-class: every pointer effect gated to fine-pointer + ships a real touch branch
  (press `:active`, or scroll-driven tilt). Never leave touch with nothing.

## Per-WP handoff notes
- **WP1 (done, bfc21d5):** All resting/hover shadows on shop/info-strip/reviews-badges+buttons/
  vaccine/medscheck/pa-card/blog-card/step now use `--shadow-card`/`--shadow-hover`. pa-card ink
  fixed to token palette. Dead duplicate `.reviews-metric:hover` removed (metric hover works now).
  `.btn` radius 6px→`--radius`. Verified computed shadows resolve to token at 375+1280, no page
  errors (only sandbox-blocked external ERR_CONNECTION_RESET, present on untouched site too).
  LEFT FOR LATER: full radius unification (nav__cta 7px, modal 30px, contact-float) deferred to
  WP2 where the button pass touches those anyway. Uber green shadows intentionally kept (brand).
  The flat `--shadow` back-compat alias still exists in `:root` — harmless, a few non-card spots
  still use it; can retire once all call sites migrate.

- **WP2 (done, 8b015cb):** Shared `:active` press rule added (grouped selector after `.btn:active`)
  covering pa-card, welcome-box, shop__card, reviews btns+badges, contact-float toggle, nav CTA,
  find-us logo btns. Nav CTA now 100px pill + token shadows + apple easing. All press targets
  have `transform` in their base transition so the press animates. NEXT SESSION: WP4 will add
  `initMagnetic` to some of these same elements — it must COMPOSE its `translate()` with the
  `:active scale(.97)` (put translate on the element, keep scale on :active) so they don't clobber
  each other's `transform`. `.find-us__logo-btn:active` press assumes that class exists — verify.

- **WP3 (done, c74b79d):** Three globals now available for WP4-6: `initMagnetic(el,opts)`,
  `revealOnce(el,cb,opts)`, `staggerReveal(container,opts)`. CSS recipe `.reveal-ready > *`
  (hidden) + `.is-revealed` (plays rvSlideIn), crawler-safe (JS adds `.reveal-ready`; no-JS shows
  all). Reduced-motion + fine-pointer gating computed once at top of the util IIFE.
  - **WP4 compose note:** for cards with a hover `transform` (pa-card translateY, etc.), call
    `initMagnetic(el, {compose:true})` AND give that element CSS
    `transform: translate(var(--mag-x,0),var(--mag-y,0)) <its own hover/scale>` so magnetic +
    hover + `:active` press don't clobber each other. For plain buttons/badges/FAB, default
    (direct transform) is fine. Nav CTA uses default and still works.
  - **WP5 usage:** `staggerReveal(document.querySelector('.welcome__boxes'))` etc. Children get
    `animation-delay` automatically. Existing reviews/team count-ups were NOT re-pointed (left
    working as-is) to keep this WP a pure add; optional cleanup later.

- **WP5 (done, cdcc09e):** `staggerReveal()` wired to `.welcome__boxes`, `.staff-grid`,
  `.blog-grid`, `.steps` (new-patients) — all verified reaching opacity 1 after scroll-in at
  375+1280, reduced-motion instant end-state. Call sites live in a small script block right
  after the WP3 utils IIFE (search "WP5: staggered scroll-reveal"). Reviews/team count-ups were
  left on their original observers (not migrated), per the WP3 note.

## Deviations from original plan
- WP1 spec included radius unification; only `.btn` radius moved in WP1. Remaining radius
  outliers folded into WP2 (button system) to keep each commit coherent. Not a scope change,
  just resequencing within the approved plan.
- WP5 spec named `.services__grid` as a reveal target — that class doesn't exist on `origin/dev`;
  `services` is actually an accordion (`.svc-acc` with 3 `.svc-acc__group` children, not a card
  grid). Substituted a lighter per-group reveal (3 groups, not per-accordion-item), consistent
  with the site audit's explicit "services: lean still, at most a per-group fade-in" guidance —
  not a scope expansion, a correction to match what's actually in the DOM.
