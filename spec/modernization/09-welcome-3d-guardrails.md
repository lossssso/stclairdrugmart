# WP9 — Welcome 3D guardrail compliance (walkin3d.js)

**Goal:** ship the already-live WebGL welcome tour to its OWN stated bar. CLAUDE.md's 3D rule
requires guardrails the current `walkin3d.js` is missing two of. Small, correctness-only.

## Do
1. **WebGL context-loss fallback (required by CLAUDE.md).** Add listeners:
   `canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); stop(); showStaticFallback(); })`
   and `webglcontextrestored` to rebuild or stay on fallback. `showStaticFallback()` swaps in the
   static `storefront_exterior.webp` (a real image, NOT a blank canvas) — reuse the classic
   `.welcome__photo-col` image or a dedicated `<img>` behind the canvas revealed on loss.
2. **Tab-hidden pause (required by CLAUDE.md).** The RAF loop currently pauses only when scrolled
   off-screen. Add `document.hidden` / `visibilitychange`: stop the loop when the tab is hidden,
   resume (if still on-screen) when visible. Combine with the existing IntersectionObserver pause.

## Reuse
Existing `stop()` (~640) and the IntersectionObserver on-screen gate (~104-109) in walkin3d.js.
Capability gate + FPS watchdog are already correct — do not touch them.

## Constraints
Don't alter the scene, camera paths, or gating thresholds. Fallback image must have proper
dimensions (no CLS). Reduced-motion path (already bails before load) unaffected.

## NOT in this WP (flagged, separate approval)
Down-converting the whole welcome hero from Three.js (~733 KB) to the About-style 2D-canvas image
sequence (~1/10th weight, zero context-loss risk). Recommended follow-up; do NOT do it here, and
do NOT rip out the live WebGL scene.

## Verify
Force a context loss (`canvas.getContext('webgl').getExtension('WEBGL_lose_context').loseContext()`
in devtools) → static storefront image appears, no blank/frozen canvas, no errors. Background the
tab mid-tour → RAF loop stops (no wasted frames), resumes on return. 375 + 1280.
