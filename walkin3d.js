/* Store walk-in 3D — the welcome section's storefront photo comes alive.
   As you scroll, the welcome section pins and its real photo zooms up to
   fill the screen, dissolves into a realistic 3D rendition of the store
   (Three.js, PBR + soft shadows), and the camera walks you in through the
   front door to clickable chat bubbles. The zoom happens on the actual
   welcome photo — no separate section.

   Progressive enhancement: nothing activates unless this module can run
   (html.w3d-on). No-JS, reduced-motion, weak devices and WebGL-less
   browsers keep the classic page — the welcome photo just sits there.
   Three.js/GSAP are vendored and only loaded once the user nears the
   welcome section. */

(function () {
  'use strict';

  var welcome = document.getElementById('welcome');
  var stage = document.getElementById('w3d-stage');
  if (!welcome || !stage) return;
  var photoEl = welcome.querySelector('.welcome__photo');
  if (!photoEl) return;

  /* #w3ddebug disables the slow-frame bail-out for testing on software
     renderers (the site's URL path-sync rewrites the hash on scroll, so
     read it once up front). */
  var noDegrade = location.hash.indexOf('w3ddebug') !== -1;

  /* ── capability gates ──────────────────────────────────────────── */
  try {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if ((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) ||
        (navigator.deviceMemory && navigator.deviceMemory <= 2)) return;
    if (document.documentElement.classList.contains('lite-clouds')) return;
    if (!('IntersectionObserver' in window)) return;
    var probe = document.createElement('canvas');
    var gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return;
    gl.getExtension('WEBGL_lose_context') && gl.getExtension('WEBGL_lose_context').loseContext();
  } catch (e) { return; }

  var root = document.documentElement;
  root.classList.add('w3d-on');

  var canvas = document.getElementById('w3d-canvas');
  var hint = document.getElementById('w3d-hint');
  var skip = document.getElementById('w3d-skip');
  var qBubble = document.getElementById('w3d-q');
  var photoCard = document.getElementById('w3d-photocard');
  var photoImg = photoCard ? photoCard.querySelector('img') : null;
  var spotEls = [].slice.call(stage.querySelectorAll('.w3d-spot'));
  var mobile = window.matchMedia('(max-width: 768px)').matches;

  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function seg(p, a, b) { var t = clamp01((p - a) / (b - a)); return t * t * (3 - 2 * t); }

  /* FLIP source: where the real welcome photo sits on screen when the pin
     engages. It's frozen during the pin, so one measure per refresh holds. */
  var flipRect = { l: 0, t: 0, w: 0, h: 0 };
  function measureFlip() {
    var r = photoEl.getBoundingClientRect();
    if (r.width > 0) flipRect = { l: r.left, t: r.top, w: r.width, h: r.height };
  }

  /* ── lazy boot: import three.js + gsap/ScrollTrigger when near ───── */
  var booted = false, engine = null, stRef = null, visible = false;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
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
  }, { rootMargin: '200% 0%' });
  nearIO.observe(welcome);

  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    if (engine) { if (visible) engine.start(); else engine.stop(); }
  }).observe(stage);

  skip.addEventListener('click', function () {
    if (stRef) window.scrollTo({ top: stRef.end + 4, behavior: 'smooth' });
  });

  /* ── the 3D engine ────────────────────────────────────────────── */
  function buildEngine(THREE, gsap, ScrollTrigger) {
    var doorEase = gsap.parseEase('back.out(1.4)');

    /* warmer, richer palette than the old flat pastels */
    var COL = {
      sky: 0xdff1f5, cream: 0xeae2d4, creamDark: 0xd8ccb8, brick: 0x9a5f4f,
      dark: 0x333b40, teal: 0x0f8b96, tealDark: 0x00646d, glass: 0xafe0e6,
      wall: 0xf3f7f7, wallWarm: 0xeef1ee, floor: 0xd9cdb6, floorLine: 0xcbbfa6,
      counter: 0x2f363b, counterTop: 0xf4f2ec, steel: 0xb9c2c4,
      shelf: 0x2c3338, shelfWood: 0xc9b189, runner: 0x8fd3d8, mat: 0x3d454a
    };
    var PASTELS = [0xe8846b, 0xe6b25a, 0x6fb98f, 0x5aa9c9, 0x8f86c9, 0xcf7fb0, 0xd8c56a, 0x7fa8d8];

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    var basePixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1.4 : 1.6);
    renderer.setPixelRatio(basePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(COL.sky);
    scene.fog = new THREE.Fog(COL.sky, 22, 46);

    var camera = new THREE.PerspectiveCamera(60, 1, 0.1, 70);

    /* ── image-based lighting: a small gradient env for soft PBR reflections ── */
    try {
      var ec = document.createElement('canvas'); ec.width = 8; ec.height = 128;
      var ectx = ec.getContext('2d');
      var eg = ectx.createLinearGradient(0, 0, 0, 128);
      eg.addColorStop(0.0, '#f4fbfc'); eg.addColorStop(0.45, '#e3f1f2');
      eg.addColorStop(0.7, '#d3dedd'); eg.addColorStop(1.0, '#b9c4c2');
      ectx.fillStyle = eg; ectx.fillRect(0, 0, 8, 128);
      var envTex = new THREE.CanvasTexture(ec);
      envTex.mapping = THREE.EquirectangularReflectionMapping;
      var pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromEquirectangular(envTex).texture;
      envTex.dispose(); pmrem.dispose();
    } catch (e) { /* env is a nicety; scene still lights without it */ }

    /* ── lights ── */
    scene.add(new THREE.HemisphereLight(0xffffff, 0xbcc9c8, 0.85));
    var sun = new THREE.DirectionalLight(0xfff4e2, 1.5);
    sun.position.set(7, 13, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 40;
    sun.shadow.camera.left = -10; sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -6;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
    scene.add(sun);
    var fill = new THREE.DirectionalLight(0xdfeaf0, 0.35);
    fill.position.set(-6, 6, 4); scene.add(fill);
    var warm = new THREE.PointLight(0xffe9c8, 0.7, 26, 1.8);
    warm.position.set(0, 3.0, -6); scene.add(warm);
    var warm2 = new THREE.PointLight(0xffe9c8, 0.5, 22, 1.8);
    warm2.position.set(0, 3.0, -12); scene.add(warm2);

    /* ── material + mesh helpers ── */
    function std(color, opts) {
      var o = Object.assign({ color: color, roughness: 0.85, metalness: 0.0 }, opts || {});
      return new THREE.MeshStandardMaterial(o);
    }
    function box(w, h, d, mat, x, y, z, opts) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
        mat instanceof THREE.Material ? mat : std(mat, opts));
      m.position.set(x, y, z);
      m.castShadow = true; m.receiveShadow = true;
      scene.add(m);
      return m;
    }
    function textCanvas(draw, w, h) {
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      draw(c.getContext('2d'));
      var t = new THREE.CanvasTexture(c);
      t.anisotropy = 4;
      if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }

    /* ── outdoors: sidewalk + facade ── */
    var sidewalkTex = textCanvas(function (ctx) {
      ctx.fillStyle = '#d3d7d5'; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#c0c5c2'; ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, 256, 256);
    }, 256, 256);
    sidewalkTex.wrapS = sidewalkTex.wrapT = THREE.RepeatWrapping;
    sidewalkTex.repeat.set(10, 6);
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(34, 16),
      std(0xd6dad8, { roughness: 0.95, map: sidewalkTex }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 7.5);
    ground.receiveShadow = true;
    scene.add(ground);

    /* facade masses */
    box(2.6, 3.1, 0.3, COL.cream, -2.9, 1.55, 0.05, { roughness: 0.9 });   /* left pier  */
    box(0.28, 3.1, 0.3, COL.creamDark, -0.24, 1.55, 0.05, { roughness: 0.9 });/* mid pier */
    box(1.3, 3.1, 0.3, COL.cream, 3.95, 1.55, 0.05, { roughness: 0.9 });   /* right pier */
    box(5.0, 0.6, 0.3, COL.cream, 0.85, 2.8, 0.05, { roughness: 0.9 });    /* header     */
    box(8.7, 0.42, 0.4, COL.dark, 0.25, 3.32, 0.12, { roughness: 0.6 });   /* awning band*/

    var signTex = textCanvas(function (ctx) {
      var g = ctx.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, '#12939f'); g.addColorStop(1, '#0d7b85');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 128);
      ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle';
      ctx.font = '700 30px Inter, Arial'; ctx.fillText('ST. CLAIR', 150, 38);
      ctx.font = '900 62px Inter, Arial'; ctx.fillText('DRUG MART', 150, 88);
      ctx.font = '700 34px Inter, Arial'; ctx.textAlign = 'right';
      ctx.fillText('416.654.8181', 985, 42);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(72, 34, 26, 62); ctx.fillRect(54, 52, 62, 26);
      ctx.fillStyle = '#7fd8de'; ctx.fillRect(78, 58, 14, 14);
    }, 1024, 128);
    var signFace = new THREE.MeshStandardMaterial({
      map: signTex, roughness: 0.5, emissive: 0x0f8b96, emissiveIntensity: 0.25, emissiveMap: signTex
    });
    var signSide = std(COL.teal, { roughness: 0.5 });
    var sign = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.98, 0.32),
      [signSide, signSide, signSide, signSide, signFace, signSide]);
    sign.position.set(0.25, 4.0, 0.14);
    sign.castShadow = true;
    scene.add(sign);

    box(8.6, 2.2, 0.32, COL.brick, 0.25, 5.55, 0.05, { roughness: 0.95 });  /* brick top  */
    box(1.7, 1.1, 0.06, 0x557079, -1.7, 5.5, 0.26, { roughness: 0.2, metalness: 0.1 });
    box(1.7, 1.1, 0.06, 0x557079, 2.1, 5.5, 0.26, { roughness: 0.2, metalness: 0.1 });

    /* storefront window: reflective glass + FARMACIA band */
    var glassMat = new THREE.MeshStandardMaterial({
      color: COL.glass, roughness: 0.06, metalness: 0.0,
      transparent: true, opacity: 0.34, envMapIntensity: 1.4
    });
    var win = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.4, 0.05), glassMat);
    win.position.set(1.6, 1.35, 0.05);
    scene.add(win);
    var bandTex = textCanvas(function (ctx) {
      ctx.fillStyle = 'rgba(15,139,150,.95)'; ctx.fillRect(0, 0, 1024, 160);
      ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle';
      ctx.font = '900 84px Inter, Arial'; ctx.fillText('1203', 60, 82);
      ctx.font = '800 76px Inter, Arial'; ctx.fillText('FARMACIA', 320, 82);
    }, 1024, 160);
    var band = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.55),
      new THREE.MeshBasicMaterial({ map: bandTex, transparent: true }));
    band.position.set(1.6, 0.5, 0.1);
    scene.add(band);

    /* door: hinge group at left jamb, swings open on scroll */
    var hinge = new THREE.Group();
    hinge.position.set(-1.55, 0, 0.05);
    scene.add(hinge);
    var doorGlass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.05),
      std(COL.glass, { roughness: 0.08, transparent: true, opacity: 0.5, envMapIntensity: 1.3 }));
    doorGlass.position.set(0.6, 1.3, 0);
    doorGlass.castShadow = true;
    hinge.add(doorGlass);
    var doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.28, 2.5, 0.08),
      std(COL.steel, { roughness: 0.35, metalness: 0.5 }));
    doorFrame.position.set(0.6, 1.3, -0.03);
    hinge.add(doorFrame);
    doorGlass.renderOrder = 2;
    var handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.34),
      std(0x9aa5a8, { roughness: 0.3, metalness: 0.7 }));
    handle.position.set(1.08, 1.25, 0.07);
    hinge.add(handle);
    box(0.1, 2.5, 0.16, COL.steel, -1.59, 1.25, 0.05, { roughness: 0.35, metalness: 0.5 });
    box(0.1, 2.5, 0.16, COL.steel, -0.31, 1.25, 0.05, { roughness: 0.35, metalness: 0.5 });
    box(1.36, 0.12, 0.16, COL.steel, -0.95, 2.55, 0.05, { roughness: 0.35, metalness: 0.5 });

    /* clouds (soft, cheap) */
    function cloud(x, y, z, s) {
      var g = new THREE.Group();
      [[0, 0, 0, 1], [0.9, 0.15, 0.1, 0.72], [-0.85, 0.1, 0.05, 0.65], [0.25, 0.42, 0, 0.6]].forEach(function (b) {
        var m = new THREE.Mesh(new THREE.SphereGeometry(b[3], 14, 12),
          new THREE.MeshBasicMaterial({ color: 0xffffff }));
        m.position.set(b[0], b[1], b[2]);
        g.add(m);
      });
      g.position.set(x, y, z); g.scale.setScalar(s);
      scene.add(g);
      return g;
    }
    var clouds = [cloud(-8, 7.8, 1.5, 1.5), cloud(7, 8.8, -1, 1.8), cloud(-2, 9.6, -4, 1.2)];

    /* ── indoors ── */
    var tileTex = textCanvas(function (ctx) {
      ctx.fillStyle = '#efe7d6'; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#ddd0b8'; ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, 256, 256);
      ctx.strokeStyle = 'rgba(0,0,0,.03)'; ctx.lineWidth = 1;
      ctx.strokeRect(4, 4, 248, 248);
    }, 256, 256);
    tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
    tileTex.repeat.set(7, 15);
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 15),
      std(0xece3d2, { roughness: 0.75, map: tileTex }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.001, -7.25);
    floor.receiveShadow = true;
    scene.add(floor);

    box(0.16, 3.2, 15, COL.wall, -3.68, 1.6, -7.25, { roughness: 0.95 });  /* wall L  */
    box(0.16, 3.2, 15, COL.wallWarm, 3.68, 1.6, -7.25, { roughness: 0.95 });/* wall R */
    box(7.5, 3.2, 0.16, 0xeef4f3, 0, 1.6, -14.6, { roughness: 0.95 });     /* wall bk */
    /* baseboards */
    box(0.2, 0.16, 15, 0xdfe6e5, -3.6, 0.08, -7.25, { roughness: 0.8 });
    box(0.2, 0.16, 15, 0xdfe6e5, 3.6, 0.08, -7.25, { roughness: 0.8 });
    var ceil = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 15),
      std(0xeef4f3, { roughness: 1.0 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, 3.2, -7.25);
    scene.add(ceil);
    /* recessed pendant lights (emissive) */
    for (var li = 0; li < 6; li++) {
      var panel = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d4, emissiveIntensity: 1.4 }));
      panel.rotation.x = Math.PI / 2;
      panel.position.set(0, 3.18, -2 - li * 2);
      scene.add(panel);
    }
    box(1.7, 0.03, 1.1, COL.mat, -0.95, 0.02, -1.2, { roughness: 0.9 });   /* welcome mat */

    /* left counter run + white top + register */
    box(0.95, 1.05, 6.6, COL.counter, -2.55, 0.525, -5.8, { roughness: 0.45, metalness: 0.1 });
    box(1.1, 0.08, 6.8, COL.counterTop, -2.55, 1.09, -5.8, { roughness: 0.35 });
    box(0.36, 0.32, 0.06, 0x20262a, -2.42, 1.42, -3.4, { roughness: 0.4 });   /* register screen */
    box(0.42, 0.06, 0.32, 0x3a4144, -2.44, 1.16, -3.35, { roughness: 0.5 });

    /* left back-wall dispensary shelving (light wood) */
    for (var si = 0; si < 3; si++)
      box(0.38, 2.1, 1.95, COL.shelfWood, -3.4, 1.05, -3.6 - si * 2.2, { roughness: 0.75 });

    /* right shelf units (dark) with wood shelf boards */
    var rightZ = [-2.8, -5.4, -8, -10.6];
    rightZ.forEach(function (z) {
      box(0.52, 2.25, 2.4, COL.shelf, 3.32, 1.12, z, { roughness: 0.6 });
      for (var b = 0; b < 4; b++)
        box(0.34, 0.04, 2.3, COL.shelfWood, 3.0, 0.28 + b * 0.52, z, { roughness: 0.7 });
    });
    for (var b2 = 0; b2 < 3; b2++)
      for (var r2 = 0; r2 < 4; r2++)
        box(0.32, 0.04, 1.9, COL.shelfWood, -3.18, 0.32 + r2 * 0.5, -3.6 - b2 * 2.2, { roughness: 0.7 });

    /* teal centre runner */
    var runner = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 9.5),
      std(COL.runner, { roughness: 0.85 }));
    runner.rotation.x = -Math.PI / 2;
    runner.position.set(0, 0.012, -6.75);
    runner.receiveShadow = true;
    scene.add(runner);

    var crossTex = textCanvas(function (ctx) {
      ctx.fillStyle = '#0f8b96'; ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(52, 22, 24, 84); ctx.fillRect(22, 52, 84, 24);
    }, 128, 128);
    var cross = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62),
      new THREE.MeshStandardMaterial({ map: crossTex, emissive: 0x0f8b96, emissiveIntensity: 0.3, emissiveMap: crossTex, roughness: 0.6 }));
    cross.position.set(-1.9, 2.55, -14.44);
    scene.add(cross);

    /* products: instanced bottles/boxes on both shelf runs */
    var prodGeo = new THREE.BoxGeometry(0.16, 0.24, 0.12);
    var prodMat = new THREE.MeshStandardMaterial({ roughness: 0.55 });
    var slots = [];
    rightZ.forEach(function (z) {
      for (var row = 0; row < 4; row++)
        for (var k = 0; k < 9; k++)
          slots.push([3.0, 0.42 + row * 0.52, z - 1.05 + k * 0.26, 0]);
    });
    for (var su = 0; su < 3; su++)
      for (var row2 = 0; row2 < 4; row2++)
        for (var k2 = 0; k2 < 7; k2++)
          slots.push([-3.18, 0.46 + row2 * 0.5, -4.4 - su * 2.2 + k2 * 0.25, 1]);
    var inst = new THREE.InstancedMesh(prodGeo, prodMat, slots.length);
    inst.castShadow = true;
    var dummy = new THREE.Object3D();
    var colC = new THREE.Color();
    slots.forEach(function (s, i2) {
      var jitter = Math.sin(i2 * 12.9898) * 0.03;
      dummy.position.set(s[0], s[1], s[2] + jitter);
      dummy.rotation.y = s[3] ? Math.PI / 2 : -Math.PI / 2;
      dummy.scale.set(1, 0.8 + (Math.abs(Math.sin(i2 * 4.1)) * 0.5), 1);
      dummy.updateMatrix();
      inst.setMatrixAt(i2, dummy.matrix);
      inst.setColorAt(i2, colC.setHex(PASTELS[i2 % PASTELS.length]));
    });
    scene.add(inst);

    /* back dispensary counter + screen + consult door + plant */
    box(3.7, 1.0, 0.6, COL.counterTop, 0.4, 0.5, -13.0, { roughness: 0.4 });
    box(3.7, 0.36, 0.62, COL.teal, 0.4, 1.03, -13.0, { roughness: 0.5 });
    box(3.1, 1.6, 0.1, COL.shelfWood, 0.4, 2.2, -14.5, { roughness: 0.75 });
    box(1.2, 0.68, 0.05, 0x1b2023, 0.4, 2.55, -14.38, { roughness: 0.3, metalness: 0.2 });
    box(0.95, 2.1, 0.09, 0xdfe7e6, -2.6, 1.05, -14.5, { roughness: 0.7 });

    box(0.36, 0.42, 0.36, 0xa9694f, 2.9, 0.21, -1.3, { roughness: 0.8 });
    var leaf = new THREE.Mesh(new THREE.SphereGeometry(0.44, 14, 12), std(0x5aa86a, { roughness: 0.8 }));
    leaf.position.set(2.9, 0.9, -1.3); leaf.scale.y = 1.35;
    leaf.castShadow = true;
    scene.add(leaf);

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
      var at = el.dataset.at ? parseFloat(el.dataset.at) : 0.63 + i * 0.034;
      return { el: el, v3: new THREE.Vector3(v[0], v[1], v[2]), at: at };
    });
    var proj = new THREE.Vector3();

    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = isNarrow() ? 70 : 60;
      camera.updateProjectionMatrix();
      path = paths();
    }
    window.addEventListener('resize', function () {
      mobile = window.matchMedia('(max-width: 768px)').matches;
      resize(); measureFlip(); ScrollTrigger.refresh();
    });
    resize();

    /* ── scroll-scrubbed pin on the WELCOME section ─────────────────
       Pin engages when the real welcome photo is centred, so the zoom
       starts on that exact photo. The pin's duration is the scroll runway
       for the whole zoom + walk-in. scrub 0.6 gives inertial catch-up. */
    var scrubP = 0;
    var runway = isNarrow() ? '360%' : '460%';
    var st = ScrollTrigger.create({
      trigger: photoEl,
      start: 'center center',
      end: '+=' + runway,
      scrub: 0.6,
      pin: welcome,
      pinSpacing: true,
      anticipatePin: 1,
      onUpdate: function (self) { scrubP = self.progress; },
      onToggle: function (self) {
        if (self.isActive) { measureFlip(); stage.classList.add('is-active'); welcome.classList.add('w3d-tour'); }
        else { stage.classList.remove('is-active'); welcome.classList.remove('w3d-tour'); }
      },
      onRefresh: measureFlip
    });
    stRef = st;
    measureFlip();

    /* ── frame loop ── */
    var active = false, rafId = null, doneFired = false;
    var lastT = 0, slow = 0, sampled = 0, degradeStep = noDegrade ? 2 : 0;

    function frame(now) {
      rafId = null;
      if (degradeStep < 2 && lastT) {
        if (now - lastT > 34) slow++;
        if (++sampled >= 90) {
          if (slow / sampled > 0.35) {
            degradeStep++;
            if (degradeStep === 1) renderer.setPixelRatio(Math.min(basePixelRatio, 1));
            else { stop(); st.kill(); root.classList.remove('w3d-on'); stage.classList.remove('is-active'); welcome.classList.remove('w3d-tour'); return; }
          }
          sampled = 0; slow = 0;
        }
      }
      lastT = now;

      var p = scrubP;
      var w = stage.clientWidth, h = stage.clientHeight;

      /* keep the FLIP anchor fresh through the opening frames — the pinned
         photo's frozen rect is only known once the pin actually engages */
      if (p < 0.02) measureFlip();

      /* welcome photo → store morph: the real photo (FLIP clone) grows
         from its spot to full-bleed, then dissolves into the 3D scene */
      if (photoCard) {
        if (p < 0.3) {
          var g = seg(p, 0, 0.10);
          var L = flipRect.l * (1 - g), T = flipRect.t * (1 - g);
          var W = flipRect.w + (w - flipRect.w) * g;
          var H = flipRect.h + (h - flipRect.h) * g;
          photoCard.style.display = 'block';
          photoCard.style.left = L.toFixed(1) + 'px';
          photoCard.style.top = T.toFixed(1) + 'px';
          photoCard.style.width = W.toFixed(1) + 'px';
          photoCard.style.height = H.toFixed(1) + 'px';
          photoCard.style.borderRadius = (14 * (1 - g)).toFixed(1) + 'px';
          photoCard.style.opacity = (1 - seg(p, 0.15, 0.28)).toFixed(3);
          if (photoImg) photoImg.style.transform = 'scale(' + (1 + 0.12 * seg(p, 0.05, 0.28)).toFixed(4) + ')';
        } else {
          photoCard.style.display = 'none';
        }
      }
      /* 3D fades in beneath the photo so at rest the card floats alone */
      canvas.style.opacity = seg(p, 0.04, 0.13).toFixed(3);

      /* camera along path (holds on the facade while the photo morphs) */
      var u = seg(p, 0.16, 1);
      var cp = path.pos.getPoint(u);
      var cl = path.look.getPoint(u);
      camera.position.copy(cp);
      if (isNarrow()) {
        cl.y += 0.3;
        camera.lookAt(cl);
        var sw = seg(p, 0.72, 1);
        if (sw > 0) camera.rotateY(0.55 - 0.98 * sw);
      } else {
        camera.lookAt(cl);
      }

      /* door swings open as you approach, with a spring-hinge overshoot */
      hinge.rotation.y = -1.9 * doorEase(clamp01((p - 0.3) / (0.52 - 0.3)));

      /* gentle cloud drift */
      var t = now * 0.00004;
      clouds.forEach(function (c, i3) {
        c.position.x += Math.sin(t * (1 + i3 * 0.3) + i3 * 2.1) * 0.002;
      });

      /* HUD */
      hint.style.opacity = (1 - seg(p, 0.06, 0.13)).toFixed(3);
      skip.style.opacity = (1 - seg(p, 0.62, 0.72)).toFixed(3);
      skip.style.pointerEvents = p > 0.68 ? 'none' : 'auto';

      /* "what brings you in?" bubble greets you once inside */
      if (qBubble) {
        var qv = seg(p, 0.58, 0.66);
        qBubble.style.opacity = qv.toFixed(3);
        qBubble.style.transform = 'translate(-50%,' + (16 * (1 - qv)).toFixed(1) + 'px)';
      }

      /* hotspots: project anchors to screen, dot-anchored labels */
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
