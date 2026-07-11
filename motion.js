/* Shared motion layer for secondary pages (portal, blog listing, braces,
   404) — a minimal port of index.html's staggerReveal. Containers marked
   [data-reveal] get .reveal-ready (children hidden only once JS is present,
   so no-JS visitors and crawlers see everything), then .is-revealed with a
   per-child delay when they scroll into view. The matching CSS recipe
   (.reveal-ready / rvSlideIn) lives in each page's own <style>.
   Reduced-motion or no IntersectionObserver: nothing is ever hidden. */
(function () {
  'use strict';
  var containers = [].slice.call(document.querySelectorAll('[data-reveal]'));
  if (!containers.length) return;
  try {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;
  } catch (e) { return; }
  containers.forEach(function (c) {
    c.classList.add('reveal-ready');
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      [].slice.call(c.children).forEach(function (kid, i) {
        kid.style.animationDelay = (i * 70) + 'ms';
      });
      c.classList.add('is-revealed');
    }, { threshold: 0.15 });
    io.observe(c);
  });
})();
