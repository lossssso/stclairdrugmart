/* Shared blog-post behaviour & enhancements — St. Clair Drug Mart Pharmacy */
(function () {
  'use strict';

  /* ── 1. Cloud drift engine (nav + sky background) ───────────────── */
  (function initClouds() {
    var els = document.querySelectorAll('.nav__cloud, .sky-bg-cloud');
    var items = [];
    els.forEach(function (el) {
      var dur = parseFloat(el.dataset.dur);
      var delay = parseFloat(el.dataset.delay) || 0;
      if (!dur) return;
      el.style.animation = 'none';
      items.push({ el: el, dur: dur, delay: delay, flip: el.className.indexOf('--flip') !== -1 });
    });
    if (!items.length) return;
    var minInterval = 1000 / 30;
    var lastFrame = 0, lastDelta = 0, slowStreak = 0, powerSaveOn = false;
    function enterPowerSave() {
      if (powerSaveOn) return;
      powerSaveOn = true;
      minInterval = 1000 / 18;
      items.forEach(function (it, i) { if (i % 2 === 1) it.el.style.display = 'none'; });
    }
    function tick(now) {
      if (now - lastFrame < minInterval) { requestAnimationFrame(tick); return; }
      if (lastDelta) {
        var gap = now - lastDelta;
        slowStreak = gap > 70 ? slowStreak + 1 : Math.max(0, slowStreak - 1);
        if (slowStreak > 12) enterPowerSave();
      }
      lastDelta = now;
      lastFrame = now;
      var t = now / 1000;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (powerSaveOn && it.el.style.display === 'none') continue;
        var prog = (((t - it.delay) % it.dur) + it.dur) % it.dur / it.dur;
        var vw = -60 + prog * 180;
        it.el.style.transform = 'translateX(' + vw.toFixed(2) + 'vw)' + (it.flip ? ' scaleX(-1)' : '');
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();

  /* ── 2. Mobile nav: dropdown toggle + close on link/outside tap ──── */
  function closeNav() {
    var links = document.querySelector('.nav__links');
    var toggle = document.querySelector('.nav__toggle');
    if (links) links.classList.remove('open');
    if (toggle) toggle.classList.remove('open');
    document.querySelectorAll('.nav__has-dropdown').forEach(function (d) { d.classList.remove('open'); });
  }
  document.querySelectorAll('.nav__links a').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var parent = link.closest('.nav__has-dropdown');
      if (parent && link === parent.querySelector(':scope > a') && window.innerWidth <= 768) {
        e.preventDefault();
        parent.classList.toggle('open');
        return;
      }
      closeNav();
    });
  });
  document.addEventListener('click', function (e) {
    var nav = document.querySelector('nav');
    if (nav && !nav.contains(e.target)) closeNav();
  });

  /* The remaining enhancements only apply to article pages. */
  var post = document.querySelector('article.post');
  if (!post) return;

  function slugify(s) {
    return s.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function brandLogo() {
    var img = document.querySelector('.nav__brand__logo');
    return img && img.src ? img.src : '../../logo.png';
  }

  /* ── 3. Reading-progress bar ─────────────────────────────────────── */
  (function initProgress() {
    var bar = document.createElement('div');
    bar.className = 'reading-progress';
    document.body.appendChild(bar);
    function update() {
      var rect = post.getBoundingClientRect();
      var total = post.offsetHeight - window.innerHeight;
      var scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      var pct = total > 0 ? (scrolled / total) * 100 : 0;
      bar.style.width = pct.toFixed(2) + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  })();

  /* ── 4. Author / E-E-A-T byline (replaces the plain meta line) ───── */
  (function initByline() {
    var h1 = post.querySelector('h1');
    if (!h1) return;
    var meta = post.querySelector('.post__meta');
    var metaText = meta ? meta.textContent.trim() : '';
    var byline = document.createElement('div');
    byline.className = 'post__byline';
    byline.innerHTML =
      '<img class="post__byline-logo" src="' + brandLogo() + '" alt="St. Clair Drug Mart Pharmacy" />' +
      '<div class="post__byline-text"><strong>St. Clair Drug Mart Pharmacy Team</strong>' +
      '<span>Written &amp; reviewed by our Toronto pharmacists' + (metaText ? ' &nbsp;·&nbsp; ' + metaText : '') + '</span></div>';
    if (meta) meta.replaceWith(byline);
    else h1.insertAdjacentElement('afterend', byline);
  })();

  /* ── 5. Table of contents, auto-built from the article's H2s ─────── */
  (function initToc() {
    var heads = Array.prototype.slice.call(post.querySelectorAll('h2'));
    if (heads.length < 3) return; // only worth showing on longer articles
    var used = {};
    var items = heads.map(function (h) {
      var base = slugify(h.textContent) || 'section';
      var id = base, n = 2;
      while (used[id]) { id = base + '-' + n; n++; }
      used[id] = true;
      h.id = id;
      return '<li><a href="#' + id + '">' + h.textContent + '</a></li>';
    }).join('');
    var toc = document.createElement('nav');
    toc.className = 'post__toc';
    toc.setAttribute('aria-label', 'Table of contents');
    toc.innerHTML = '<div class="post__toc-title">In this article</div><ol>' + items + '</ol>';
    var anchor = post.querySelector('.post__lead') || post.querySelector('.post__byline');
    if (anchor) anchor.insertAdjacentElement('afterend', toc);
    else post.insertBefore(toc, post.querySelector('h2'));
  })();

  /* ── 6. Share row ────────────────────────────────────────────────── */
  (function initShare() {
    var url = encodeURIComponent(location.href);
    var title = encodeURIComponent(document.title);
    var share = document.createElement('div');
    share.className = 'post__share';
    share.innerHTML =
      '<span class="post__share-label">Share this article:</span>' +
      '<a href="https://www.facebook.com/sharer/sharer.php?u=' + url + '" target="_blank" rel="noopener" aria-label="Share on Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>' +
      '<a href="https://twitter.com/intent/tweet?url=' + url + '&text=' + title + '" target="_blank" rel="noopener" aria-label="Share on X"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.4 8.4L23.5 22h-6.9l-5.4-7-6.2 7H1.1l7.9-9L.8 2h7l4.9 6.5L18.9 2zm-1.2 18h1.9L7.4 4H5.4l12.3 16z"/></svg></a>' +
      '<a href="https://www.linkedin.com/sharing/share-offsite/?url=' + url + '" target="_blank" rel="noopener" aria-label="Share on LinkedIn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4V9h4v1.4A6 6 0 0 1 16 8zM2 9h4v12H2zM4 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/></svg></a>' +
      '<button type="button" class="post__share-copy" aria-label="Copy link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg></button>';
    var disclaimer = post.querySelector('.post__disclaimer');
    if (disclaimer) disclaimer.insertAdjacentElement('beforebegin', share);
    else post.appendChild(share);
    var copyBtn = share.querySelector('.post__share-copy');
    if (copyBtn) copyBtn.addEventListener('click', function () {
      var done = function () {
        copyBtn.classList.add('copied');
        setTimeout(function () { copyBtn.classList.remove('copied'); }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(location.href).then(done, done);
      } else { done(); }
    });
  })();

  /* ── 7. About / E-E-A-T author card ──────────────────────────────── */
  (function initAuthorCard() {
    var card = document.createElement('aside');
    card.className = 'post__author';
    card.innerHTML =
      '<img class="post__author-logo" src="' + brandLogo() + '" alt="St. Clair Drug Mart Pharmacy" />' +
      '<div class="post__author-body">' +
      '<h4>About St. Clair Drug Mart Pharmacy</h4>' +
      '<p>We’re an independent, OCP-accredited pharmacy at 1203 St. Clair Ave W in Toronto’s St. Clair West neighbourhood. Our pharmacists assess and prescribe for common conditions, give vaccines, and review medications — walk in any time during store hours.</p>' +
      '<div class="post__author-links"><a href="../index.html">← More from The Health Hub</a><a href="../../index.html#contact">Find &amp; visit us →</a></div>' +
      '</div>';
    var disclaimer = post.querySelector('.post__disclaimer');
    if (disclaimer) disclaimer.insertAdjacentElement('beforebegin', card);
    else post.appendChild(card);
  })();

})();
