# WP7 — Break uniform section rhythm + focal hierarchy + sectional depth

**Goal:** the highest-impact "de-template" pass. Stop every section looking identical.

## Do
1. **Rhythm:** replace the blanket `section { padding: 5rem 1.5rem; }` (~567) with a small scale
   (e.g. `--sec-pad-lg/-md/-sm`), assigning generous space to hero-adjacent/focal sections and
   tighter to list sections. Vary, don't randomize.
2. **Heading variety:** the identical `.section__title` + `56px` underline `::after` (~579)
   repeated 12× is the strongest AI tell. Give 2–3 sections a distinct signature — an eyebrow
   label, a different alignment, or a number/rule treatment — instead of the same molecule
   everywhere. Keep the rest consistent (variety ≠ chaos).
3. **Focal card per grid:** promote ONE card in a grid via span/scale/border-accent — e.g. the
   free MedsCheck `.welcome-box`, and the 4.9★ `.reviews-metric`. Breaks the "equal tiles" look.
4. **Sectional depth:** subtle top/bottom gradient fades or a faint elevated panel behind a focal
   group. Teal-ice/white washes ONLY — no new hues.

## Constraints
No palette change. Keep responsive 375→desktop (focal span must collapse gracefully on mobile).
Do this AFTER WP1–6 so it composes over consistent shadows/buttons/reveals.

## Verify
Page no longer reads as 12 identical bands; focal cards draw the eye; mobile still single-column
and legible. 375 + 1280. No overflow, no CLS.
