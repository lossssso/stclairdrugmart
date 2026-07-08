/* Store walk-in 3D — scroll-driven Three.js tour of a stylized St. Clair
   Drug Mart, embedded in the Welcome section after the services boxes.
   Progressive enhancement: the block stays display:none unless this module
   activates it (html.w3d-on); no-JS, reduced-motion, weak devices and
   WebGL-less browsers keep the classic page (including the classic
   "What brings you in today?" pills, which are only hidden under w3d-on).
   Three.js is vendored at vendor/three.module.min.js and only imported
   once the user nears the section. Guardrails per CLAUDE.md: capability
   gate, live FPS sentinel (drop DPR, then bail), capped pixel ratio,
   render loop paused off-screen. */

(function () {
  'use strict';

  var track = document.getElementById('w3d-track');
  if (!track) return;

  /* ── capability gates ──────────────────────────────────────────── */
  try {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if ((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) ||
        (navigator.deviceMemory && navigator.deviceMemory <= 2)) return;
    /* lite-clouds = the perf guard *measured* this device struggling (or it's
       the weakest hardware) — trust that signal. Mid-core-count devices boot
       and are protected by the live FPS sentinel below instead: modern
       iPhones report as few as 4 cores yet run this scene easily, so a
       core-count cut-off above 2 would wrongly exclude them. */
    if (document.documentElement.classList.contains('lite-clouds')) return;
    if (!('IntersectionObserver' in window)) return;
    var probe = document.createElement('canvas');
    var gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return;
    gl.getExtension('WEBGL_lose_context') && gl.getExtension('WEBGL_lose_context').loseContext();
  } catch (e) { return; }

  var root = document.documentElement;
  root.classList.add('w3d-on');

  var stage = track.querySelector('.w3d__stage');
  var canvas = document.getElementById('w3d-canvas');
  var hint = document.getElementById('w3d-hint');
  var skip = document.getElementById('w3d-skip');
  var spotEls = [].slice.call(track.querySelectorAll('.w3d-spot'));

  /* ── WebGL context-loss fallback (required guardrail) ─────────────
     Swaps to the real storefront photo already sitting in the DOM
     (never a blank/frozen canvas). Once lost, this scene stays on the
     fallback rather than attempting a full renderer/geometry rebuild —
     the engine closure isn't designed to be re-entered, and a photo is
     a perfectly good permanent landing state for the rare case a GPU
     actually drops context mid-tour. */
  var contextLost = false;
  function showStaticFallback() {
    contextLost = true;
    stage.classList.add('w3d--lost');
    if (engine) engine.stop();
  }
  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    showStaticFallback();
  });
  canvas.addEventListener('webglcontextrestored', function () {
    /* Intentionally stay on the static fallback — see comment above. */
  });

  /* ── tab-hidden pause (required guardrail) — combines with the
     existing on-screen IntersectionObserver below via the same
     engine.start()/stop(); whichever gate is stricter wins. ── */
  document.addEventListener('visibilitychange', function () {
    if (!engine || contextLost) return;
    if (document.hidden) engine.stop();
    else if (visible) engine.start();
  });

  /* ── stage pinning (body{overflow-x:hidden} breaks position:sticky) ── */
  var pinState = -1;
  function pin(force) {
    var rect = track.getBoundingClientRect();
    var vh = window.innerHeight;
    var want = rect.top > 0 ? 0 : (rect.bottom < vh ? 2 : 1);
    if (want === pinState && !force) return;
    pinState = want;
    if (want === 1) {
      stage.style.position = 'fixed';
      stage.style.top = '0'; stage.style.bottom = 'auto';
      stage.style.left = rect.left + 'px'; stage.style.right = 'auto';
      stage.style.width = rect.width + 'px';
    } else {
      stage.style.position = 'absolute';
      stage.style.left = '0'; stage.style.right = '0'; stage.style.width = '';
      if (want === 0) { stage.style.top = '0'; stage.style.bottom = 'auto'; }
      else { stage.style.top = 'auto'; stage.style.bottom = '0'; }
    }
  }
  pin(true);

  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function seg(p, a, b) { var t = clamp01((p - a) / (b - a)); return t * t * (3 - 2 * t); }

  /* ── lazy boot: import three.js + gsap/ScrollTrigger when near ───── */
  var booted = false, engine = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  var nearIO = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting && !booted) {
      booted = true;
      nearIO.disconnect();
      Promise.all([
        loadScript('./vendor/gsap.min.js').then(function () {
          return loadScript('./vendor/ScrollTrigger.min.js');
        }),
        import('./vendor/three.module.min.js')
      ]).then(function (results) {
        var THREE = results[1];
        window.gsap.registerPlugin(window.ScrollTrigger);
        engine = buildEngine(THREE, window.gsap, window.ScrollTrigger);
        if (visible) engine.start();
      }).catch(function () {
        root.classList.remove('w3d-on');
      });
    }
  }, { rootMargin: '150% 0%' });
  nearIO.observe(track);

  var visible = false;
  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    if (engine) { if (visible && !contextLost) engine.start(); else { engine.stop(); pin(true); } }
    else if (!visible) pin(true);
  }).observe(track);

  skip.addEventListener('click', function () {
    var y = window.scrollY + track.getBoundingClientRect().bottom - window.innerHeight + 2;
    window.scrollTo({ top: y, behavior: 'smooth' });
  });

  /* ── the 3D engine ────────────────────────────────────────────── */
  function buildEngine(THREE, gsap, ScrollTrigger) {
    var doorEase = gsap.parseEase('back.out(1.4)');

    var COL = {
      sky: 0xcfeff5, cream: 0xefe9df, brick: 0x9b6353, dark: 0x3c4448,
      teal: 0x1794a0, tealDark: 0x00737c, glass: 0xbfe8ee,
      wall: 0xf7fcfc, floor: 0xf4f8f8, counter: 0x454b4f, top: 0xffffff,
      shelf: 0x4a5054, shelfLight: 0xe8efef, sidewalk: 0xe3e8e8, mat: 0x5c6467,
      frame: 0x0d5f66, wood: 0x8a6248
    };
    var PASTELS = [0xffd6a5, 0xffadad, 0xcaffbf, 0x9bf6ff, 0xbdb2ff, 0xffc6ff, 0xfdffb6, 0xa0c4ff];
    var GREENS = [0x63b26a, 0x4e9e58, 0x7cc47f];

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    var basePixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(basePixelRatio);

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(COL.sky);
    scene.fog = new THREE.Fog(COL.sky, 20, 42);

    var camera = new THREE.PerspectiveCamera(62, 1, 0.1, 60);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xc2d6d8, 1.2));
    var sun = new THREE.DirectionalLight(0xfff6e8, 0.9);
    sun.position.set(6, 10, 12);
    scene.add(sun);
    var inLight = new THREE.PointLight(0xfff9ec, 0.55, 18, 1.6);
    inLight.position.set(0, 2.9, -6);
    scene.add(inLight);
    var warmBack = new THREE.PointLight(0xffefd8, 0.35, 12, 1.8);
    warmBack.position.set(0.4, 2.6, -12.5);
    scene.add(warmBack);

    function lam(color, opts) {
      var o = Object.assign({ color: color }, opts || {});
      return new THREE.MeshLambertMaterial(o);
    }
    function box(w, h, d, color, x, y, z, opts) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(color, opts));
      m.position.set(x, y, z);
      scene.add(m);
      return m;
    }

    /* ── the real logo (logo.png) — composited into the sign + wall
       textures once loaded; a drawn cross stands in until then / on
       failure, so the scene never waits on the network. ── */
    var logoImg = new Image();
    var logoReady = false;

    function drawLogoBadge(ctx, x, y, size) {
      /* just the real logo (it's already got its own transparent
         background) — or a drawn cross fallback — preserving aspect ratio,
         no added white card behind it. */
      var pad = size * 0.12;
      if (logoReady) {
        var iw = logoImg.naturalWidth, ih = logoImg.naturalHeight;
        var s = Math.min((size - pad * 2) / iw, (size - pad * 2) / ih);
        var dw = iw * s, dh = ih * s;
        ctx.drawImage(logoImg, x + (size - dw) / 2, y + (size - dh) / 2, dw, dh);
      } else {
        ctx.fillStyle = '#1794a0';
        var u = size / 5;
        ctx.fillRect(x + 2 * u, y + u, u, 3 * u);
        ctx.fillRect(x + u, y + 2 * u, 3 * u, u);
      }
    }

    /* sign texture (redrawable so the logo pops in when it loads) */
    var signCanvas = document.createElement('canvas');
    signCanvas.width = 1024; signCanvas.height = 128;
    function drawSign() {
      var ctx = signCanvas.getContext('2d');
      ctx.clearRect(0, 0, 1024, 128);
      ctx.fillStyle = '#1794a0'; ctx.fillRect(0, 0, 1024, 128);
      drawLogoBadge(ctx, 34, 18, 92);
      ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.font = '700 33px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText('ST. CLAIR', 162, 33);
      ctx.font = '800 74px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText('DRUG MART', 162, 91);
      ctx.font = '700 34px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('416.654.8181', 985, 42);
      ctx.font = '600 26px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText('PHARMACY', 985, 88);
    }
    drawSign();
    var signTex = new THREE.CanvasTexture(signCanvas);
    signTex.anisotropy = 4;

    /* interior back-wall logo card */
    var wallCanvas = document.createElement('canvas');
    wallCanvas.width = 256; wallCanvas.height = 256;
    function drawWallLogo() {
      var ctx = wallCanvas.getContext('2d');
      ctx.clearRect(0, 0, 256, 256);
      drawLogoBadge(ctx, 8, 8, 240);
    }
    drawWallLogo();
    var wallTex = new THREE.CanvasTexture(wallCanvas);
    wallTex.anisotropy = 4;

    logoImg.onload = function () {
      logoReady = true;
      drawSign(); signTex.needsUpdate = true;
      drawWallLogo(); wallTex.needsUpdate = true;
    };
    logoImg.src = 'logo.png';

    function textCanvas(draw, w, h) {
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      draw(c.getContext('2d'));
      var t = new THREE.CanvasTexture(c);
      t.anisotropy = 4;
      return t;
    }

    /* ── plants — parametric helper so greenery is cheap to place ── */
    function plant(x, z, s, tall, potColor) {
      var g = new THREE.Group();
      var pot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.26, 10),
        lam(potColor || 0xb0705c));
      pot.position.y = 0.13;
      g.add(pot);
      var blobs = tall
        ? [[0, 0.98, 0, 0.30], [0.14, 1.12, 0.05, 0.24], [-0.13, 1.10, -0.04, 0.22], [0.02, 1.30, 0, 0.20]]
        : [[0, 0.44, 0, 0.26], [0.16, 0.38, 0.06, 0.20], [-0.15, 0.40, -0.05, 0.19], [0.03, 0.58, 0.02, 0.17]];
      if (tall) {
        var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.62, 8), lam(COL.wood));
        trunk.position.y = 0.55;
        g.add(trunk);
      }
      blobs.forEach(function (b, i) {
        var leaf = new THREE.Mesh(new THREE.SphereGeometry(b[3], 10, 8), lam(GREENS[i % 3]));
        leaf.position.set(b[0], b[1], b[2]);
        g.add(leaf);
      });
      g.position.set(x, 0, z);
      g.scale.setScalar(s || 1);
      scene.add(g);
      return g;
    }

    /* ── street tree — matches the real storefront photo: a trunk on the
       sidewalk beside the door with branches forking up into a leafy canopy
       that overhangs the sign (not just floating blobs on a bare pole). ── */
    function tree(x, z, s) {
      var g = new THREE.Group();
      var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 3.2, 8), lam(COL.wood));
      trunk.position.y = 1.6;
      g.add(trunk);

      /* branches fork off the upper trunk; each ends in a leaf cluster so the
         foliage reads as attached to wood. [baseY, azimuth, tilt, length] */
      var up = new THREE.Vector3(0, 1, 0);
      var branchSpecs = [
        [2.5, 0.5, 0.95, 1.5], [2.7, 2.5, 0.85, 1.6], [2.9, 4.3, 0.9, 1.4],
        [3.0, 5.7, 0.75, 1.3], [3.2, 1.5, 0.5, 1.15], [3.3, 3.6, 0.45, 1.05]
      ];
      var tips = [];
      branchSpecs.forEach(function (bs) {
        var baseY = bs[0], az = bs[1], tilt = bs[2], len = bs[3];
        var dir = new THREE.Vector3(
          Math.sin(tilt) * Math.cos(az), Math.cos(tilt), Math.sin(tilt) * Math.sin(az)
        ).normalize();
        var branch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.07, len, 6), lam(COL.wood));
        branch.quaternion.setFromUnitVectors(up, dir);
        branch.position.set(dir.x * len / 2, baseY + dir.y * len / 2, dir.z * len / 2);
        g.add(branch);
        tips.push(new THREE.Vector3(dir.x * len, baseY + dir.y * len, dir.z * len));
      });

      /* leaf clusters: one at each branch tip + a couple filling the crown.
         Each cluster is a few overlapping spheres so it looks full, not spherical. */
      var centers = tips.concat([
        new THREE.Vector3(0, 3.95, 0), new THREE.Vector3(0.35, 3.5, 0.25),
        new THREE.Vector3(-0.4, 3.6, -0.15)
      ]);
      var clusterBlobs = [[0, 0, 0, 0.68], [0.34, 0.12, 0.1, 0.5], [-0.3, 0.1, -0.14, 0.48], [0.06, 0.36, 0.05, 0.44]];
      centers.forEach(function (c, i) {
        clusterBlobs.forEach(function (cb, j) {
          var leaf = new THREE.Mesh(new THREE.SphereGeometry(cb[3], 10, 8), lam(GREENS[(i + j) % 3]));
          leaf.position.set(c.x + cb[0], c.y + cb[1], c.z + cb[2]);
          g.add(leaf);
        });
      });

      g.position.set(x, 0, z);
      g.scale.setScalar(s || 1);
      scene.add(g);
      return g;
    }

    /* ── outdoors ── */
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 15), lam(COL.sidewalk));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 7.5);
    scene.add(ground);

    /* facade: piers cream, striped awning, teal sign, brick top w/ windows */
    box(2.4, 3.1, 0.25, COL.cream, -2.8, 1.55, 0.05);          /* left pier   */
    box(0.25, 3.1, 0.25, COL.cream, -0.225, 1.55, 0.05);       /* mid pier    */
    box(1.2, 3.1, 0.25, COL.cream, 3.9, 1.55, 0.05);           /* right pier  */
    box(4.9, 0.6, 0.25, COL.cream, 0.85, 2.8, 0.05);           /* header      */
    box(8.5, 0.25, 0.3, COL.dark, 0.25, 3.24, 0.08);           /* fascia band */

    /* striped canopy over the entrance/window run */
    var awnTex = textCanvas(function (ctx) {
      for (var i = 0; i < 16; i++) {
        ctx.fillStyle = i % 2 ? '#ffffff' : '#1794a0';
        ctx.fillRect(i * 64, 0, 64, 128);
      }
    }, 1024, 128);
    awnTex.anisotropy = 4;
    /* stripes on top AND underside — from the sidewalk you look up at it */
    var awnStripe = new THREE.MeshBasicMaterial({ map: awnTex });
    var awning = new THREE.Mesh(new THREE.BoxGeometry(8.7, 0.05, 0.95),
      [lam(COL.teal), lam(COL.teal), awnStripe, awnStripe, lam(COL.teal), lam(COL.teal)]);
    awning.position.set(0.25, 3.3, 0.55);
    awning.rotation.x = -0.18;
    scene.add(awning);
    box(8.7, 0.1, 0.05, 0xffffff, 0.25, 3.21, 1.02);           /* canopy lip  */

    var sign = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.95, 0.3),
      [lam(COL.teal), lam(COL.teal), lam(COL.teal), lam(COL.teal),
       new THREE.MeshBasicMaterial({ map: signTex }), lam(COL.teal)]);
    sign.position.set(0.25, 4.0, 0.12);
    scene.add(sign);

    box(8.5, 2.1, 0.3, COL.brick, 0.25, 5.5, 0.05);            /* brick top   */
    /* upstairs windows: framed panes with sills, not flat slabs */
    [-1.7, 2.1].forEach(function (wx) {
      box(1.9, 1.3, 0.06, 0xf5f2ea, wx, 5.45, 0.21);           /* frame       */
      box(1.7, 1.1, 0.05, 0x6d8a92, wx, 5.45, 0.24);           /* pane        */
      box(0.05, 1.1, 0.04, 0xf5f2ea, wx, 5.45, 0.27);          /* mullion V   */
      box(1.7, 0.05, 0.04, 0xf5f2ea, wx, 5.45, 0.27);          /* mullion H   */
      box(2.0, 0.09, 0.18, COL.cream, wx, 4.78, 0.14);         /* sill        */
    });

    /* storefront window (see-through) + teal frame + FARMACIA band */
    box(3.4, 2.35, 0.04, COL.glass, 1.6, 1.325, 0.05,
      { transparent: true, opacity: 0.3 });
    box(3.56, 0.08, 0.1, COL.frame, 1.6, 2.54, 0.07);          /* rail top    */
    box(3.56, 0.08, 0.1, COL.frame, 1.6, 0.12, 0.07);          /* rail bottom */
    box(0.08, 2.5, 0.1, COL.frame, -0.06, 1.325, 0.07);        /* stile L     */
    box(0.08, 2.5, 0.1, COL.frame, 3.26, 1.325, 0.07);         /* stile R     */
    box(0.05, 2.35, 0.08, COL.frame, 1.6, 1.325, 0.08);        /* mullion     */
    var bandTex = textCanvas(function (ctx) {
      ctx.fillStyle = 'rgba(23,148,160,.92)'; ctx.fillRect(0, 0, 1024, 160);
      ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle';
      ctx.font = '800 84px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText('1203', 60, 80);
      ctx.font = '800 76px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText('FARMACIA', 320, 80);
    }, 1024, 160);
    var band = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.55),
      new THREE.MeshBasicMaterial({ map: bandTex, transparent: true }));
    band.position.set(1.6, 0.45, 0.09);
    scene.add(band);

    /* door: hinge group at left jamb, swings open on scroll */
    var hinge = new THREE.Group();
    hinge.position.set(-1.55, 0, 0.05);
    scene.add(hinge);
    var doorGlass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.05),
      lam(COL.glass, { transparent: true, opacity: 0.45 }));
    doorGlass.position.set(0.6, 1.3, 0);
    hinge.add(doorGlass);
    var doorBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.07), lam(0xcfd6d8));
    doorBar.position.set(0.6, 1.05, 0);
    hinge.add(doorBar);
    var handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.32), lam(0x9aa5a8));
    handle.position.set(1.08, 1.25, 0.06);
    hinge.add(handle);
    box(0.08, 2.5, 0.14, 0xcfd6d8, -1.59, 1.25, 0.05);         /* jamb L */
    box(0.08, 2.5, 0.14, 0xcfd6d8, -0.31, 1.25, 0.05);         /* jamb R */
    box(1.36, 0.1, 0.14, 0xcfd6d8, -0.95, 2.55, 0.05);         /* jamb top */
    box(1.5, 0.06, 0.55, 0xd6dddd, -0.95, 0.03, 0.42);         /* entry step */

    /* greenery out front: the street tree sits in its own sidewalk planter
       with a few low bushes tucked around its base (no standalone pot by the
       door — that overlapped the window planter). One tall planter still
       flanks the door on the right; bushes run under the window. */
    tree(-2.85, 2.15, 1.0);                                    /* street tree by the door, per the real photo */
    box(1.3, 0.28, 0.9, COL.wood, -2.85, 0.14, 2.15);          /* tree planter */
    [[-3.25, 2.25], [-2.45, 2.35], [-3.0, 1.9]].forEach(function (p, i) {
      var b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), lam(GREENS[i % 3]));
      b.position.set(p[0], 0.34, p[1]);
      scene.add(b);
    });
    plant(0.2, 0.55, 1.05, true, 0x9a8f83);                    /* tall planter right of door */
    box(3.15, 0.26, 0.34, COL.wood, 1.6, 0.13, 0.52);          /* window planter */
    for (var pb = 0; pb < 4; pb++) {
      var bush = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), lam(GREENS[pb % 3]));
      bush.position.set(0.5 + pb * 0.74, 0.4, 0.52);
      scene.add(bush);
    }

    /* clouds (brand touch) */
    function cloud(x, y, z, s) {
      var g = new THREE.Group();
      [[0, 0, 0, 1], [0.9, 0.15, 0.1, 0.72], [-0.85, 0.1, 0.05, 0.65], [0.25, 0.42, 0, 0.6]].forEach(function (b) {
        var m = new THREE.Mesh(new THREE.SphereGeometry(b[3], 14, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        m.position.set(b[0], b[1], b[2]);
        g.add(m);
      });
      g.position.set(x, y, z);
      g.scale.setScalar(s);
      scene.add(g);
      return g;
    }
    var clouds = [cloud(-7, 7.6, 1.5, 1.4), cloud(6.5, 8.6, -1, 1.7), cloud(-2, 9.4, -4, 1.1)];

    /* ── indoors ── */
    var tileTex = textCanvas(function (ctx) {
      ctx.fillStyle = '#f4f8f8'; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#dde8e8'; ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, 256, 256);
    }, 256, 256);
    tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
    tileTex.repeat.set(7, 15);
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 15), lam(0xffffff, { map: tileTex }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.001, -7.25);
    scene.add(floor);

    box(0.15, 3.2, 15, COL.wall, -3.65, 1.6, -7.25);           /* wall L  */
    box(0.15, 3.2, 15, COL.wall, 3.65, 1.6, -7.25);            /* wall R  */
    box(7.4, 3.2, 0.15, 0xf2f9f9, 0, 1.6, -14.55);             /* wall bk */
    var ceil = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 15), new THREE.MeshBasicMaterial({ color: 0xf2f8f8 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, 3.2, -7.25);
    scene.add(ceil);
    for (var li = 0; li < 6; li++) {
      var disc = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20),
        new THREE.MeshBasicMaterial({ color: 0xfffbe8 }));
      disc.rotation.x = Math.PI / 2;
      disc.position.set(0, 3.19, -2 - li * 2);
      scene.add(disc);
    }
    box(1.6, 0.02, 1.0, COL.mat, -0.95, 0.012, -1.2);          /* welcome mat */

    /* pod lights over the counter — flush recessed discs, same style as the
       ceiling pods running down the aisle (no hanging cords/shades — the
       real store doesn't have pendant lighting). */
    [-3.5, -5.5, -7.5].forEach(function (pz) {
      var pod = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20),
        new THREE.MeshBasicMaterial({ color: 0xfffbe8 }));
      pod.rotation.x = Math.PI / 2;
      pod.position.set(-2.55, 3.19, pz);
      scene.add(pod);
    });

    /* left counter run + white top + register */
    box(0.9, 1.05, 6.5, COL.counter, -2.55, 0.525, -5.75);
    box(1.05, 0.06, 6.7, COL.top, -2.55, 1.08, -5.75);
    box(0.34, 0.3, 0.05, 0x2b3134, -2.45, 1.4, -3.4);          /* register screen */
    box(0.4, 0.05, 0.3, 0x3a4144, -2.45, 1.14, -3.35);

    /* left back-wall dispensary shelving (light) */
    for (var si = 0; si < 3; si++) box(0.35, 2.1, 1.9, COL.shelfLight, -3.4, 1.05, -3.6 - si * 2.2);

    /* right shelf units (dark) */
    var rightZ = [-2.8, -5.4, -8, -10.6];
    rightZ.forEach(function (z) {
      box(0.5, 2.2, 2.4, COL.shelf, 3.3, 1.1, z);
      for (var b = 0; b < 4; b++) box(0.32, 0.03, 2.3, 0xdfe7e7, 3.0, 0.235 + b * 0.52, z);
    });
    for (var b2 = 0; b2 < 3; b2++)
      for (var r2 = 0; r2 < 4; r2++)
        box(0.3, 0.03, 1.9, 0xffffff, -3.18, 0.295 + r2 * 0.5, -3.6 - b2 * 2.2);
    box(1.1, 0.012, 9.5, 0xcbeef1, 0, 0.007, -6.75);           /* teal runner */

    /* back-wall brand mark: the real logo on a white card */
    var wallLogo = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.72),
      new THREE.MeshBasicMaterial({ map: wallTex, transparent: true }));
    wallLogo.position.set(-1.9, 2.5, -14.38);
    scene.add(wallLogo);

    /* products: instanced pastel boxes on left-light and right-dark shelves */
    var prodGeo = new THREE.BoxGeometry(0.16, 0.22, 0.12);
    var prodMat = new THREE.MeshLambertMaterial();
    var slots = [];
    rightZ.forEach(function (z) {
      for (var row = 0; row < 4; row++)
        for (var k = 0; k < 9; k++)
          slots.push([3.0, 0.36 + row * 0.52, z - 1.05 + k * 0.26, 0]);
    });
    for (var su = 0; su < 3; su++)
      for (var row2 = 0; row2 < 4; row2++)
        for (var k2 = 0; k2 < 7; k2++)
          slots.push([-3.18, 0.42 + row2 * 0.5, -4.4 - su * 2.2 + k2 * 0.25, 1]);
    var inst = new THREE.InstancedMesh(prodGeo, prodMat, slots.length);
    var dummy = new THREE.Object3D();
    var colC = new THREE.Color();
    slots.forEach(function (s, i2) {
      dummy.position.set(s[0], s[1], s[2] + (Math.sin(i2 * 12.9898) * 0.03));
      dummy.rotation.y = s[3] ? Math.PI / 2 : -Math.PI / 2;
      dummy.updateMatrix();
      inst.setMatrixAt(i2, dummy.matrix);
      inst.setColorAt(i2, colC.setHex(PASTELS[i2 % PASTELS.length]));
    });
    scene.add(inst);

    /* back dispensary */
    box(3.6, 1.0, 0.6, COL.top, 0.4, 0.5, -12.9);
    box(3.6, 0.35, 0.62, COL.teal, 0.4, 1.02, -12.9);
    box(3.0, 1.6, 0.1, COL.shelfLight, 0.4, 2.2, -14.45);      /* back shelf grid */
    box(1.1, 0.65, 0.04, 0x22282b, 0.4, 2.55, -14.32);         /* TV */
    box(0.9, 2.1, 0.08, 0xe6eeee, -2.6, 1.05, -14.45);         /* consult door */

    /* greenery inside: window nook, aisle ends, counter end, consult + back corners */
    plant(2.9, -1.3, 1.0, false);
    plant(-2.5, -9.35, 0.8, false, 0xcdd6d6);
    plant(2.95, -11.9, 0.85, false, 0xcdd6d6);
    plant(-2.6, -13.55, 1.05, true);
    plant(2.85, -13.4, 1.0, true, 0x9a8f83);

    /* ── camera path ── */
    var isNarrow = function () { return stage.clientWidth / Math.max(stage.clientHeight, 1) < 0.75; };
    function paths() {
      var startZ = isNarrow() ? 16.5 : 11.5;
      var pos = new THREE.CatmullRomCurve3([
        new THREE.Vector3(1.4, 1.55, startZ),
        new THREE.Vector3(-0.2, 1.65, 6.0),
        new THREE.Vector3(-0.95, 1.6, 1.2),
        new THREE.Vector3(-0.5, 1.6, -0.8),
        new THREE.Vector3(0.0, 1.62, -1.8)
      ]);
      var look = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.2, 3.0, 0),
        new THREE.Vector3(-0.95, 1.6, 0),
        new THREE.Vector3(-0.4, 1.55, -4),
        new THREE.Vector3(0.1, 1.45, -9),
        new THREE.Vector3(0.15, 1.4, -13)
      ]);
      return { pos: pos, look: look };
    }
    var path = paths();

    /* ── hotspot anchors (world space) ── */
    var anchors = spotEls.map(function (el, i) {
      var v = (el.dataset.pos || '0,1.5,-5').split(',').map(Number);
      return { el: el, v3: new THREE.Vector3(v[0], v[1], v[2]), at: 0.5 + i * 0.042 };
    });
    var proj = new THREE.Vector3();

    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = isNarrow() ? 70 : 62;
      camera.updateProjectionMatrix();
      path = paths();
    }
    window.addEventListener('resize', function () { resize(); pin(true); ScrollTrigger.refresh(); });
    resize();

    /* ── scroll-scrubbed progress (GSAP ScrollTrigger) ──────────────
       scrub: 0.6 gives the camera path a smoothed, inertial "catch-up"
       to the raw scroll position instead of snapping to it 1:1. Pin
       stays off here; the stage is pinned separately via pin() above
       because body{overflow-x:hidden} breaks ScrollTrigger's own pin. */
    var scrubP = 0;
    var st = ScrollTrigger.create({
      trigger: track,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
      onUpdate: function (self) { scrubP = self.progress; }
    });

    /* ── frame loop w/ FPS sentinel (drop DPR, then bail to classic) ── */
    var active = false, rafId = null, doneFired = false;
    var lastT = 0, slow = 0, sampled = 0, degradeStep = 0;

    function frame(now) {
      rafId = null;
      if (degradeStep < 2 && lastT) {
        if (now - lastT > 34) slow++;
        if (++sampled >= 90) {
          if (slow / sampled > 0.35) {
            degradeStep++;
            if (degradeStep === 1) renderer.setPixelRatio(Math.min(basePixelRatio, 1));
            else {
              /* still chugging: bow out to the classic page */
              stop();
              st.kill();
              root.classList.remove('w3d-on');
              return;
            }
          }
          sampled = 0; slow = 0;
        }
      }
      lastT = now;

      pin(false);
      var p = scrubP;

      /* camera along path */
      var u = seg(p, 0, 1);
      var cp = path.pos.getPoint(u);
      var cl = path.look.getPoint(u);
      camera.position.copy(cp);
      if (isNarrow()) {
        /* portrait: raise the gaze, then sweep the room at the end so every
           hotspot gets its moment inside the narrow view cone */
        cl.y += 0.3;
        camera.lookAt(cl);
        var sw = seg(p, 0.72, 1);
        if (sw > 0) camera.rotateY(0.55 - 0.98 * sw);
      } else {
        camera.lookAt(cl);
      }

      /* door opens as you approach, with a slight spring-hinge overshoot */
      hinge.rotation.y = -1.9 * doorEase(clamp01((p - 0.2) / (0.42 - 0.2)));

      /* gentle cloud drift */
      var t = now * 0.00004;
      clouds.forEach(function (c, i3) {
        c.position.x += Math.sin(t * (1 + i3 * 0.3) + i3 * 2.1) * 0.002;
      });

      /* HUD */
      hint.style.opacity = (1 - seg(p, 0.03, 0.09)).toFixed(3);
      skip.style.opacity = (1 - seg(p, 0.55, 0.65)).toFixed(3);
      skip.style.pointerEvents = p > 0.6 ? 'none' : 'auto';

      /* hotspots: project anchors to screen, dot-anchored labels */
      var w = stage.clientWidth, h = stage.clientHeight;
      anchors.forEach(function (a) {
        var vis2 = seg(p, a.at, a.at + 0.08);
        if (vis2 <= 0.01) { a.el.style.opacity = '0'; a.el.style.pointerEvents = 'none'; a.el.tabIndex = -1; return; }
        proj.copy(a.v3).project(camera);
        var behind = proj.z > 1 || proj.z < -1;
        var sx = (proj.x * 0.5 + 0.5) * w;
        var sy = (-proj.y * 0.5 + 0.5) * h;
        var off = Math.abs(proj.x) > 1.05 || Math.abs(proj.y) > 1.1;
        if (behind || off) { a.el.style.opacity = '0'; a.el.style.pointerEvents = 'none'; a.el.tabIndex = -1; return; }
        var flip = a.el.classList.contains('w3d-spot--flip');
        var base = flip ? 'translate(calc(-100% + 14px),-50%)' : 'translate(-14px,-50%)';
        a.el.style.left = sx.toFixed(1) + 'px';
        a.el.style.top = sy.toFixed(1) + 'px';
        a.el.style.transform = base + ' scale(' + (0.6 + 0.4 * vis2).toFixed(3) + ')';
        a.el.style.opacity = vis2.toFixed(3);
        a.el.style.pointerEvents = vis2 > 0.7 ? 'auto' : 'none';
        a.el.tabIndex = vis2 > 0.7 ? 0 : -1;
      });

      renderer.render(scene, camera);

      if (p > 0.95 && !doneFired) {
        doneFired = true;
        try { if (typeof gtag === 'function') gtag('event', 'store_walkin3d_complete'); } catch (e) {}
      }
      if (active) rafId = requestAnimationFrame(frame);
    }

    function start() {
      if (active) return;
      active = true; lastT = 0;
      rafId = requestAnimationFrame(frame);
    }
    function stop() {
      active = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    return { start: start, stop: stop };
  }
})();
