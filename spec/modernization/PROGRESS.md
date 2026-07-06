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
| — | scaffolding | In Progress | this folder + tracker |
| 1 | 01-shadow-radius-tokens.md | Not Started | pure CSS, safest first |
| 2 | 02-tactile-button-system.md | Not Started | depends on WP1 radius scale |
| 3 | 03-extract-js-utils.md | Not Started | initMagnetic + revealOnce |
| 4 | 04-apply-magnetic-press.md | Not Started | depends on WP2, WP3 |
| 5 | 05-scroll-reveal-safe-sections.md | Not Started | depends on WP3 |
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

## Deviations from original plan
- (none yet)
