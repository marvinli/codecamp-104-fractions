/* Sierpinski slides:
 *   1. sierpinski            the falling-middles fractal, with click-to-zoom (canvas, recomputed geometry)
 *   2. sierpinski-draw       paper activity rules + a big classroom countdown timer
 *   3. sierpinski-fractions  the 3/4 multiplication ladder
 *   4. recursion             recipes that use themselves (code, stopping rule, cat-in-a-frame)
 */
(function () {
  const { el, svg } = Deck;
  const W = 1920, H = 1080, SQ3 = Math.sqrt(3) / 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = Deck.clamp;

  /* ---------- shared helpers ---------- */
  function frac(n, d, cls = '') {
    return el('span', { class: 'sx-frac ' + cls },
      el('span', { class: 'n', text: String(n) }), el('i', { class: 'bar' }), el('span', { class: 'd', text: String(d) }));
  }
  const triPts = (x, y, L) => [[x, y], [x - L / 2, y + L * SQ3], [x + L / 2, y + L * SQ3]];
  const midPts = (x, y, L) => [[x - L / 4, y + L / 2 * SQ3], [x + L / 4, y + L / 2 * SQ3], [x, y + L * SQ3]];
  const P = ps => ps.map(p => p[0].toFixed(2) + ',' + p[1].toFixed(2)).join(' ');
  function Timers() {
    let ids = [];
    return {
      later(fn, ms) { const id = setTimeout(fn, ms); ids.push(id); return id; },
      clear() { ids.forEach(clearTimeout); ids = []; },
    };
  }
  function stars(root, n = 240) {
    const c = el('canvas', { class: 'sx-stars', width: W, height: H });
    const g = c.getContext('2d');
    for (let i = 0; i < n; i++) {
      const x = Math.random() * W, y = Math.random() * H, big = Math.random() < .07, r = big ? rand(1.6, 2.6) : rand(.5, 1.4);
      if (big) {
        const gr = g.createRadialGradient(x, y, 0, x, y, r * 7);
        gr.addColorStop(0, 'rgba(255,220,255,.35)'); gr.addColorStop(1, 'rgba(255,220,255,0)');
        g.fillStyle = gr; g.fillRect(x - r * 7, y - r * 7, r * 14, r * 14);
      }
      g.fillStyle = `hsla(${rand(200, 330)}, 80%, ${rand(82, 97)}%, ${rand(.3, .9)})`;
      g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    root.append(c);
    for (let i = 0; i < 28; i++) root.append(el('i', {
      class: 'sx-twinkle',
      style: { left: rand(0, W) + 'px', top: rand(0, H) + 'px', animationDelay: rand(0, 4) + 's', animationDuration: rand(2.2, 4.5) + 's' },
    }));
  }

  /* =====================================================================================
   * 1. THE SIERPINSKI TRIANGLE
   * World space == screen space at zoom 1. Triangles live in a tree (node = top vertex + side),
   * the camera maps world -> screen, and every frame re-projects the tree, culling off-screen
   * branches and stopping at sub-pixel ones. So zooms stay crisp and only visible triangles split.
   * ===================================================================================== */
  (function () {
    const ROOT = { x: 960, y: 118, L: 960 };
    const MIN_SPLIT = 7;          // don't split triangles smaller than this on screen (px)
    const CAP = 2300;             // never split more than this many at once
    const RUN_LEVELS = 6;
    let root, cam, canvas, ctx, k = 1, raf = 0, lastT = 0, active = false, begun = false;
    let pieces = [], sparks = [], run = null, zoom = null, zooms = 0, whoaPlayed = false;
    let ui = {}, statsDirty = false, statsAt = 0;
    const snd = {};
    const T = Timers();

    const node = (x, y, L, lv) => ({ x, y, L, lv, kids: null, split: 0, hp: 0 });
    const hue = lv => (292 + lv * 33) % 360;
    const camFor = n => { const s = ROOT.L / n.L; return { s, ox: n.x - ROOT.x / s, oy: n.y - ROOT.y / s }; };
    const sx = x => (x - cam.ox) * cam.s, sy = y => (y - cam.oy) * cam.s;

    function sound(name, gap) {
      const now = performance.now();
      if (now - (snd[name] || 0) < gap) return;
      snd[name] = now; Sound.sfx(name);
    }

    function visible(n) {
      const x = sx(n.x), y = sy(n.y), L = n.L * cam.s;
      return !(x + L / 2 < 0 || x - L / 2 > W || y > H || y + L * SQ3 < 0);
    }
    function leaves(minPx) {
      const out = [];
      (function walk(n) {
        if (!visible(n)) return;
        if (n.kids) { if (n.L * cam.s >= 2.5) n.kids.forEach(walk); return; }
        if (n.L * cam.s >= minPx) out.push(n);
      })(root);
      return out;
    }
    function stats() {
      let count = 0, lv = 0;
      (function walk(n) {
        if (!visible(n)) return;
        if (n.kids && n.L * cam.s >= 1.5) return n.kids.forEach(walk);
        count++; lv = Math.max(lv, n.lv);
      })(root);
      return { count, lv };
    }

    function divide(n, fx) {
      const h = n.L / 2, hh = h * SQ3, lv = n.lv + 1;
      n.kids = [node(n.x, n.y, h, lv), node(n.x - h / 2, n.y + hh, h, lv), node(n.x + h / 2, n.y + hh, h, lv)];
      n.split = 0; n.hp = 0;
      if (fx) spawnPiece(n);
    }
    function spawnPiece(n) {
      const sL = n.L * cam.s;
      const pts = midPts(n.x, n.y, n.L).map(([x, y]) => [sx(x), sy(y)]);
      const cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3, cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
      const kick = Math.min(1, sL / 400);
      pieces.push({
        pts: pts.map(([x, y]) => [x - cx, y - cy]), cx, cy, age: 0, rot: 0,
        vx: rand(-1, 1) * (40 + 260 * kick), vy: -(80 + 520 * kick) * rand(.6, 1), vr: rand(-1, 1) * (2 + 5 * (1 - kick)) + rand(-1.5, 1.5),
        h: hue(n.lv), lw: clamp(sL / 120, .8, 4),
      });
      if (sL > 90) for (let i = 0; i < 14; i++) {
        const p = pts[i % 3], a = rand(0, Math.PI * 2), v = rand(120, 520) * kick + 60;
        sparks.push({ x: p[0], y: p[1], vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, age: 0, life: rand(.4, .8), r: rand(2, 5) * (.5 + kick) });
      }
    }

    /* ---------- the level-by-level sequencer (driven from the frame loop) ---------- */
    function startRun(levels) { run = { left: levels, i: 0, lvl: null }; nextLevel(); }
    function nextLevel() {
      if (!run) return;
      if (run.left <= 0) return endRun();
      const list = leaves(MIN_SPLIT);
      if (!list.length || list.length > CAP) return endRun();
      const i = run.i;
      const xs = list.map(n => sx(n.x) * .65 + sy(n.y) * .35);
      const lo = Math.min(...xs), hi = Math.max(...xs), span = hi - lo || 1;
      const win = list.length === 1 ? 0 : Math.min(720, 260 + i * 110);
      run.lvl = {
        t0: performance.now(), dDiv: Math.max(170, 640 * Math.pow(.74, i)), hold: Math.max(70, 300 * Math.pow(.72, i)),
        gap: Math.max(260, 640 * Math.pow(.8, i)), last: 0, n: list.length,
        items: list.map((n, j) => ({ n, delay: win * (xs[j] - lo) / span, started: false, done: false })),
      };
    }
    function stepRun(now) {
      const L = run && run.lvl;
      if (!L) return;
      const t = now - L.t0;
      let all = true;
      for (const it of L.items) {
        if (it.done) continue;
        all = false;
        const lt = t - it.delay;
        if (lt <= 0) continue;
        if (!it.started) { it.started = true; sound('chop', run.i === 0 ? 0 : 140); }
        it.n.split = Math.min(1, lt / L.dDiv);
        it.n.hp = clamp((lt - L.dDiv) / L.hold, 0, 1);
        if (lt >= L.dDiv + L.hold) {
          it.done = true; divide(it.n, true); L.last = t; statsDirty = true;
          if (run.i === 0) { Sound.sfx('thud'); setTimeout(() => Sound.sfx('boing'), 90); }
          else if (run.i < 3) sound('boing', 160);
          else sound('pop', 75);
        }
      }
      if (all && t > L.last + L.gap) {
        run.i++; run.left--; run.lvl = null;
        updateStats(true);
        nextLevel();
      }
    }
    function finishLevelNow() {
      const L = run && run.lvl;
      if (L) for (const it of L.items) if (!it.done) { it.done = true; divide(it.n, it.started && pieces.length < 600); }
      run = null;
    }
    function endRun() {
      run = null;
      updateStats(false);
      Sound.sfx('sparkle');
      T.later(() => showHint(true), 500);
    }

    /* ---------- camera ---------- */
    const smooth = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    function camLerp(a, b, t) {
      if (Math.abs(Math.log(b.s / a.s)) < 1e-9) return { s: a.s, ox: a.ox + (b.ox - a.ox) * t, oy: a.oy + (b.oy - a.oy) * t };
      const s = a.s * Math.pow(b.s / a.s, t);
      const px = (b.ox * b.s - a.ox * a.s) / (b.s - a.s), py = (b.oy * b.s - a.oy * a.s) / (b.s - a.s);
      return { s, ox: px - (px - a.ox) * a.s / s, oy: py - (py - a.oy) * a.s / s };
    }
    function zoomTo(target, done) {
      const ratio = Math.abs(Math.log2(target.s / cam.s));
      zoom = { from: cam, to: target, t0: performance.now(), dur: clamp(900 + ratio * 210, 1000, 2600), done };
      Sound.sfx('whoosh');
      ui.slide.classList.add('sp-zooming');
    }
    function stepZoom(now) {
      if (!zoom) return;
      const t = clamp((now - zoom.t0) / zoom.dur, 0, 1);
      cam = camLerp(zoom.from, zoom.to, smooth(t));
      updateZoomLabel();
      if (t >= 1) {
        cam = zoom.to; const d = zoom.done; zoom = null;
        ui.slide.classList.remove('sp-zooming');
        updateStats(true); d && d();
      }
    }

    /* ---------- interaction ---------- */
    function begin() {
      if (begun) return;
      begun = true;
      ui.begin.classList.add('gone');
      Sound.sfx('drum');
      T.later(() => startRun(RUN_LEVELS), 700);
    }
    function pick(wx, wy) {
      const inside = (n) => {
        const dy = wy - n.y;
        return dy >= 0 && dy <= n.L * SQ3 && Math.abs(wx - n.x) <= dy / SQ3 / 2;
      };
      if (!inside(root)) return null;
      let n = root;
      while (n.kids && n.L * cam.s / 2 >= 10) {
        let kid = n.kids.find(inside);
        if (!kid) {
          if (n.L * cam.s / 2 > 70) return 'hole';  // a big empty middle: that's a miss
          // tiny gap: forgive the click and take the nearest corner triangle
          const d = c => Math.hypot(c.x - wx, c.y + c.L * SQ3 * 2 / 3 - wy);
          kid = n.kids.reduce((a, b) => d(a) < d(b) ? a : b);
        }
        n = kid;
      }
      return n;
    }
    function onClick(e) {
      if (!active || zoom) return;
      const p = Deck.stagePoint(e);
      if (!begun) { if (pick(p.x / cam.s + cam.ox, p.y / cam.s + cam.oy)) begin(); return; }
      const n = pick(p.x / cam.s + cam.ox, p.y / cam.s + cam.oy);
      if (!n) return;
      if (n === 'hole') { Sound.sfx('tick'); ripple(p.x, p.y, false); return; }
      if (n.L * cam.s > ROOT.L * .95) { Deck.bump(ui.panel, 'anim-shake'); return; }  // already full size
      ripple(p.x, p.y, true);
      finishLevelNow();
      showHint(false);
      zoomTo(camFor(n), () => {
        zooms++;
        Sound.sfx('sparkle');
        if (!whoaPlayed) { whoaPlayed = true; Sound.voice('tri/whoa'); }
        flashWhoa();
        T.later(() => startRun(RUN_LEVELS), 650);
      });
    }
    function zoomOut() {
      if (!begun || zoom) return;
      if (cam.s === 1) { Deck.bump(ui.out, 'anim-shake'); return; }
      finishLevelNow(); showHint(false);
      zoomTo({ s: 1, ox: 0, oy: 0 }, () => { Sound.sfx('sparkle'); T.later(() => showHint(true), 300); });
    }
    function reset() {
      T.clear(); run = null; zoom = null; pieces = []; sparks = [];
      root = node(ROOT.x, ROOT.y, ROOT.L, 0);
      cam = { s: 1, ox: 0, oy: 0 }; begun = false; zooms = 0;
      ui.slide.classList.remove('sp-zooming');
      ui.begin.classList.remove('gone');
      showHint(false);
      updateStats(false); updateZoomLabel();
    }
    function ripple(x, y, good) {
      const r = el('i', { class: 'sp-ripple' + (good ? ' good' : ''), style: { left: x + 'px', top: y + 'px' } });
      ui.slide.append(r); setTimeout(() => r.remove(), 800);
    }
    function flashWhoa() {
      const w = ui.whoa;
      w.textContent = ['WHOA!', 'SAME AGAIN!', 'IT NEVER ENDS!', 'DEEPER!', 'STILL SIERPINSKI!'][Math.min(zooms - 1, 4)];
      Deck.bump(w, 'show');
    }
    function showHint(on) { ui.hint.classList.toggle('show', on && begun); }

    function updateStats(bump) {
      const s = stats();
      const lv = ui.level.textContent;
      ui.level.textContent = s.lv;
      ui.count.textContent = Deck.fmt(s.count) + (s.count === 1 ? ' triangle' : ' triangles');
      if (bump && lv !== String(s.lv)) Deck.bump(ui.level, 'sp-bump');
      ui.level.style.color = `hsl(${hue(s.lv)}, 100%, 72%)`;
    }
    function updateZoomLabel() {
      ui.zoom.textContent = '×' + Deck.fmt(Math.round(cam.s));
      ui.zoomChip.classList.toggle('on', cam.s > 1.01);
      ui.slide.classList.toggle('sp-deep', cam.s > 1.5);
    }

    /* ---------- drawing ---------- */
    function draw() {
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const groups = new Map(), splits = [];
      (function walk(n) {
        if (!visible(n)) return;
        const L = n.L * cam.s;
        if (n.kids && L >= 2.5) return n.kids.forEach(walk);
        let g = groups.get(n.lv);
        if (!g) groups.set(n.lv, g = { path: new Path2D(), L });
        const x = sx(n.x), y = sy(n.y), h = L * SQ3;
        g.path.moveTo(x, y); g.path.lineTo(x - L / 2, y + h); g.path.lineTo(x + L / 2, y + h); g.path.closePath();
        if (n.split > 0) splits.push(n);
      })(root);

      const lvls = [...groups.keys()].sort((a, b) => a - b);
      for (const lv of lvls) {
        const g = groups.get(lv), h = hue(lv);
        const grad = ctx.createLinearGradient(0, 90, 0, 990);
        grad.addColorStop(0, `hsl(${h}, 100%, 74%)`);
        grad.addColorStop(.55, `hsl(${h + 22}, 96%, 61%)`);
        grad.addColorStop(1, `hsl(${h + 48}, 92%, 52%)`);
        ctx.shadowColor = `hsla(${h}, 100%, 62%, .75)`;
        ctx.shadowBlur = 46;
        ctx.fillStyle = grad;
        ctx.fill(g.path);
        ctx.shadowBlur = 0;
        const sheen = ctx.createLinearGradient(300, 80, 1300, 1000);
        sheen.addColorStop(0, 'rgba(255,255,255,.28)'); sheen.addColorStop(.45, 'rgba(255,255,255,0)'); sheen.addColorStop(1, 'rgba(60,0,90,.18)');
        ctx.fillStyle = sheen; ctx.fill(g.path);
        if (g.L > 9) {
          ctx.strokeStyle = `hsla(${h}, 100%, 92%, .6)`;
          ctx.lineWidth = clamp(g.L / 140, .7, 3);
          ctx.lineJoin = 'round';
          ctx.stroke(g.path);
        }
      }

      if (splits.length) {
        const lines = new Path2D(), flash = new Path2D(), dots = new Path2D();
        let lw = 1, hp = 0;
        for (const n of splits) {
          const L = n.L * cam.s;
          lw = clamp(L / 95, 1, 7);
          const m = midPts(n.x, n.y, n.L).map(([x, y]) => [sx(x), sy(y)]);
          const p = n.split * 3;
          lines.moveTo(m[0][0], m[0][1]);
          for (let s = 0; s < 3; s++) {
            const a = m[s], b = m[(s + 1) % 3], f = clamp(p - s, 0, 1);
            if (f <= 0) break;
            lines.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f);
          }
          if (L > 40) {
            const r = lw * 1.7 * Math.min(1, n.split * 4);
            for (const q of m) { dots.moveTo(q[0] + r, q[1]); dots.arc(q[0], q[1], r, 0, Math.PI * 2); }
          }
          if (n.hp > 0) { flash.moveTo(m[0][0], m[0][1]); flash.lineTo(m[1][0], m[1][1]); flash.lineTo(m[2][0], m[2][1]); flash.closePath(); hp = n.hp; }
        }
        ctx.fillStyle = `rgba(20,6,50,${.45 * hp})`; ctx.fill(flash);
        ctx.shadowColor = 'rgba(255,255,255,.9)'; ctx.shadowBlur = 14;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.stroke(lines);
        ctx.fillStyle = '#fff'; ctx.fill(dots);
        ctx.shadowBlur = 0;
      }

      for (const p of pieces) {
        const a = 1 - clamp((p.age - .45) / 1.0, 0, 1);
        const sc = 1 + .1 * Math.sin(Math.min(p.age / .16, 1) * Math.PI);
        ctx.setTransform(k * sc * Math.cos(p.rot), k * sc * Math.sin(p.rot), -k * sc * Math.sin(p.rot), k * sc * Math.cos(p.rot), k * p.cx, k * p.cy);
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.moveTo(p.pts[0][0], p.pts[0][1]); ctx.lineTo(p.pts[1][0], p.pts[1][1]); ctx.lineTo(p.pts[2][0], p.pts[2][1]); ctx.closePath();
        ctx.fillStyle = `hsl(${p.h + 20}, 96%, 63%)`; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = p.lw; ctx.stroke();
      }
      ctx.setTransform(k, 0, 0, k, 0, 0);
      for (const s of sparks) {
        ctx.globalAlpha = 1 - s.age / s.life;
        ctx.fillStyle = '#fff6c8';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      if (!active) return;
      if (statsDirty && now - statsAt > 90) { statsDirty = false; statsAt = now; updateStats(true); }
      const dt = Math.min(.05, (now - lastT) / 1000 || 0); lastT = now;
      stepZoom(now);
      if (!zoom) stepRun(now);
      for (const p of pieces) { p.age += dt; p.vy += 2600 * dt; p.cx += p.vx * dt; p.cy += p.vy * dt; p.rot += p.vr * dt; }
      pieces = pieces.filter(p => p.age < 1.6 && p.cy < H + 300);
      for (const s of sparks) { s.age += dt; s.vy += 900 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= .97; }
      sparks = sparks.filter(s => s.age < s.life);
      draw();
      raf = requestAnimationFrame(frame);
    }

    Deck.add({
      id: 'sierpinski', music: 'space', title: 'The Sierpinski Triangle', theme: 'sx-space',
      build(rootEl) {
        ui.slide = rootEl;
        stars(rootEl);
        rootEl.append(el('div', { class: 'sp-floor' }));
        canvas = el('canvas', { class: 'sp-canvas', width: W, height: H });
        ctx = canvas.getContext('2d');
        canvas.addEventListener('pointerdown', onClick);
        rootEl.append(canvas);
        rootEl.append(el('div', { class: 'sp-titlebox' },
          el('div', { class: 'kicker', text: 'A fractal' }),
          el('h1', { class: 'title sp-title', html: 'The <span class="hl">Sierpinski</span><br>Triangle' })));
        ui.panel = el('div', { class: 'sp-panel panel' },
          el('div', { class: 'kicker', text: 'Level' }),
          ui.level = el('div', { class: 'sp-level', text: '0' }),
          ui.count = el('div', { class: 'sp-count', text: '1 triangle' }),
          ui.zoomChip = el('div', { class: 'sp-zoomchip' }, el('span', { text: 'ZOOM ' }), ui.zoom = el('b', { text: '×1' })));
        rootEl.append(ui.panel);
        ui.begin = el('button', { class: 'btn sp-begin', text: 'BEGIN', onclick: begin });
        rootEl.append(ui.begin);
        ui.hint = el('div', { class: 'bubble tail-left sp-hint', html: 'Click <b>ANY</b> little<br>triangle to <b>zoom in!</b>' });
        rootEl.append(ui.hint);
        ui.whoa = el('div', { class: 'sp-whoa', text: 'WHOA!' });
        rootEl.append(ui.whoa);
        ui.out = el('button', { class: 'btn teal small sp-out', html: '&#8722; Zoom out', onclick: zoomOut });
        rootEl.append(el('div', { class: 'sp-ctrls' }, ui.out,
          el('button', { class: 'btn red small', html: '&#8635; Reset', onclick: () => { Sound.sfx('slide'); reset(); } })));
        reset();
      },
      enter() {
        active = true;
        k = clamp(Deck.scale * (window.devicePixelRatio || 1), 1, 2);
        canvas.width = Math.round(W * k); canvas.height = Math.round(H * k);
        lastT = performance.now();
        raf = requestAnimationFrame(frame);
      },
      leave() {
        active = false; cancelAnimationFrame(raf); T.clear();
        if (zoom) { cam = zoom.to; zoom = null; ui.slide.classList.remove('sp-zooming'); }
        finishLevelNow(); pieces = []; sparks = [];
        if (begun) { updateStats(false); updateZoomLabel(); showHint(true); }
      },
    });
  })();

  /* =====================================================================================
   * 2. YOUR TURN! (paper activity + timer)
   * ===================================================================================== */
  (function () {
    const T = Timers();
    let total = 300, remain = 300, running = false, endAt = 0, iv = 0, lastSec = -1;
    let ui = {};
    const CIRC = 2 * Math.PI * 215;

    // mini demo triangles, viewBox 0 0 200 180
    const TX = 100, TY = 10, TL = 180;
    const COLORS = ['#ff6fb5', '#ffc93c', '#22d3c5'];
    function demo(kind) {
      const s = svg('svg', { viewBox: '0 0 200 180', class: 'sd-demo sd-demo-' + kind });
      const outline = svg('polygon', { points: P(triPts(TX, TY, TL)), class: 'sd-pencil' });
      const mids = midPts(TX, TY, TL);
      const corners = (x, y, L) => [[x, y, L / 2], [x - L / 4, y + L / 2 * SQ3, L / 2], [x + L / 4, y + L / 2 * SQ3, L / 2]];
      const dots = () => mids.map((m, i) => svg('circle', { cx: m[0], cy: m[1], r: 8, class: 'sd-dot', style: `animation-delay:${.15 + i * .35}s` }));
      const lines = (anim) => [0, 1, 2].map(i => {
        const a = mids[i], b = mids[(i + 1) % 3];
        return svg('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'sd-line' + (anim ? ' draw' : ''), pathLength: 100, style: anim ? `animation-delay:${.2 + i * .45}s` : '' });
      });
      if (kind === 1) { s.append(outline, ...dots()); }
      if (kind === 2) {
        s.append(outline, ...lines(true));
        mids.forEach(m => s.append(svg('circle', { cx: m[0], cy: m[1], r: 7, class: 'sd-dot still' })));
      }
      if (kind === 3) {
        corners(TX, TY, TL).forEach((c, i) => s.append(svg('polygon', { points: P(triPts(...c)), class: 'sd-fill', fill: COLORS[i], style: `animation-delay:${.2 + i * .4}s` })));
        s.append(svg('polygon', { points: P(mids), class: 'sd-empty' }));
        s.append(outline, ...lines(false));
        s.append(svg('text', { x: TX, y: 120, class: 'sd-emptytxt', 'text-anchor': 'middle' }, document.createTextNode('empty!')));
      }
      if (kind === 4) {
        corners(TX, TY, TL).forEach((c, i) => s.append(svg('polygon', { points: P(triPts(...c)), fill: COLORS[i], class: 'sd-solid' })));
        corners(TX, TY, TL).forEach((c, i) => {
          const g = svg('g', { class: 'sd-again', style: `animation-delay:${.25 + i * .5}s` });
          g.append(svg('polygon', { points: P(midPts(...c)), class: 'sd-hole' }));
          s.append(g);
        });
        s.append(outline, ...lines(false));
      }
      return s;
    }
    const RULES = [
      ['Find the <b>middle</b> of each side.', 'Make a dot!'],
      ['<b>Connect</b> the dots.', 'Use a ruler!'],
      ['<b>Color</b> the 3 corners.<br>Leave the middle <b>empty</b>.', ''],
      ['Do it <b>again</b> on each colored triangle!', 'and again… and again…'],
    ];

    function fmtTime(sec) { sec = Math.ceil(sec); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
    function paint() {
      ui.digits.textContent = fmtTime(remain);
      ui.prog.style.strokeDashoffset = CIRC * (1 - remain / total);
      const c = remain <= 10 ? 'var(--red)' : remain <= 60 ? 'var(--gold)' : 'var(--teal)';
      ui.timer.style.setProperty('--tc', c);
      ui.face.style.setProperty('--tc', c);
      ui.go.innerHTML = running ? '&#10074;&#10074; Pause' : (remain < total && remain > 0 ? '&#9654; Go on' : '&#9654; Start');
      ui.go.classList.toggle('red', running);
      ui.mini.innerHTML = running ? '&#10074;&#10074;' : '&#9654;';
      ui.timer.classList.toggle('running', running);
      ui.timer.classList.toggle('hurry', running && remain <= 10);
      ['running', 'hurry', 'done'].forEach(k => ui.face.classList.toggle(k, ui.timer.classList.contains(k)));
    }
    function setPreset(min, btn) {
      ui.timer.classList.remove('done'); pause();
      total = remain = min * 60; lastSec = -1;
      ui.presets.forEach(b => b.classList.toggle('on', b === btn));
      Sound.sfx('blip'); paint(); Deck.bump(ui.digits, 'sd-flip');
    }
    function start() {
      ui.timer.classList.remove('done');
      ui.face.classList.remove('done');
      if (remain <= 0) remain = total;
      running = true; endAt = performance.now() + remain * 1000;
      clearInterval(iv); iv = setInterval(tick, 100);
      Sound.sfx('coin'); paint();
    }
    function pause() {
      if (running) remain = Math.max(0, (endAt - performance.now()) / 1000);
      running = false; clearInterval(iv); paint();
    }
    function tick() {
      remain = Math.max(0, (endAt - performance.now()) / 1000);
      const sec = Math.ceil(remain);
      if (sec !== lastSec) {
        lastSec = sec;
        if (sec <= 10 && sec > 0) { Sound.sfx('tick'); Deck.bump(ui.digits, 'sd-flip'); }
      }
      if (remain <= 0) return finish();
      paint();
    }
    function finish() {
      running = false; clearInterval(iv); remain = 0; paint();
      ui.timer.classList.add('done'); ui.face.classList.add('done');
      ui.digits.textContent = 'TIME!';
      [0, 450, 900].forEach(d => T.later(() => Sound.sfx('ding'), d));
      T.later(() => Sound.voice('tri/times-up'), 1300);
      Deck.confetti(ui.slide, 140);
    }
    function toggle() { running ? (pause(), Sound.sfx('tick')) : start(); }

    Deck.add({
      id: 'sierpinski-draw', music: 'draw', title: 'Your Turn!', theme: 'sx-space sd-slide', steps: 4,
      build(root) {
        ui.slide = root;
        stars(root, 140);
        root.append(el('div', { class: 'sd-head' },
          el('div', { class: 'kicker', text: 'Pencils ready' }),
          el('h1', { class: 'title', html: 'Your <span class="hl">Turn!</span>' }),
          el('div', { class: 'sd-sub', text: 'Draw your own Sierpinski triangle' })));
        const grid = el('div', { class: 'sd-grid' });
        RULES.forEach(([txt, note], i) => grid.append(el('div', { class: 'sd-card', 'data-at': i, style: `--hue:${[330, 45, 175, 270][i]}` },
          el('div', { class: 'sd-num', text: i + 1 }),
          el('div', { class: 'sd-paper' }, demo(i + 1)),
          el('div', { class: 'sd-text' }, el('div', { html: txt }), note ? el('div', { class: 'sd-note', text: note }) : null))));
        root.append(grid);

        const ring = svg('svg', { viewBox: '0 0 500 500', class: 'sd-ring' },
          svg('circle', { cx: 250, cy: 250, r: 215, class: 'sd-track' }),
          ui.prog = svg('circle', { cx: 250, cy: 250, r: 215, class: 'sd-prog', 'stroke-dasharray': CIRC, transform: 'rotate(-90 250 250)' }));
        ui.digits = el('div', { class: 'sd-digits', text: '5:00' });
        ui.face = el('div', { class: 'sd-face', title: 'Click to make it HUGE', onclick: () => { ui.slide.classList.toggle('sd-big'); Sound.sfx('whoosh'); } },
          ring, el('div', { class: 'sd-face-in' }, el('div', { class: 'sd-label', text: 'TIMER' }), ui.digits,
            ui.mini = el('button', { class: 'sd-mini', 'aria-label': 'Start or pause', onclick: e => { e.stopPropagation(); toggle(); } })));
        ui.presets = [3, 5, 8].map(m => el('button', { class: 'btn small violet sd-preset' + (m === 5 ? ' on' : ''), html: `${m}<small>min</small>`, onclick: e => setPreset(m, e.currentTarget) }));
        ui.go = el('button', { class: 'btn teal sd-go', html: '&#9654; Start', onclick: toggle });
        ui.timer = el('div', { class: 'sd-timer panel' },
          el('div', { class: 'sd-presets' }, ...ui.presets),
          ui.go,
          el('div', { class: 'sd-tip', text: 'tap the clock to make it huge' }));
        root.append(ui.timer, el('div', { class: 'sd-backdrop', onclick: () => ui.slide.classList.remove('sd-big') }), ui.face);
        paint();
      },
      enter() { },
      step(n) { Deck.reveal(ui.slide, n); if (n > 0) Sound.sfx('pop'); },
      leave() { pause(); T.clear(); ui.slide.classList.remove('sd-big'); },
    });
  })();

  /* =====================================================================================
   * 3. HOW MUCH IS LEFT?
   * ===================================================================================== */
  (function () {
    const T = Timers();
    const N = [1, 3, 9, 27, 81, 243], D = [1, 4, 16, 64, 256, 1024];
    const TX = 430, TY = 26, TL = 790;
    let ui = {}, shown = -1;

    function tris(level) {
      let list = [[TX, TY, TL]];
      for (let i = 0; i < level; i++) {
        const next = [];
        for (const [x, y, L] of list) { const h = L / 2; next.push([x, y, h], [x - h / 2, y + h * SQ3, h], [x + h / 2, y + h * SQ3, h]); }
        list = next;
      }
      return list;
    }
    function drawTri(level) {
      ui.fill.innerHTML = '';
      const sw = level < 3 ? 3 : level < 5 ? 1.6 : 1;
      for (const t of tris(level)) ui.fill.append(svg('polygon', { points: P(triPts(...t)), class: 'sf-on', 'stroke-width': sw }));
    }
    function midlines(level) {
      ui.lines.innerHTML = '';
      for (const t of tris(level)) ui.lines.append(svg('polygon', { points: P(midPts(...t)), class: 'sf-mid', pathLength: 100 }));
    }
    function dropMiddles(level) {
      tris(level).forEach((t, i, arr) => {
        const p = svg('polygon', { points: P(midPts(...t)), class: 'sf-fall', style: `--dx:${rand(-160, 160)}px;--r:${rand(-260, 260)}deg;animation-delay:${(i / arr.length) * 260}ms` });
        ui.falls.append(p);
      });
      T.later(() => { ui.falls.innerHTML = ''; ui.lines.innerHTML = ''; }, 1900);
    }
    function num(v) { return v === 1 ? el('span', { class: 'sf-one', text: '1' }) : null; }

    function setCards(n) {
      ui.filled.replaceChildren(n === 0 ? el('span', { class: 'sf-whole', text: '1' }) : frac(N[n], D[n]));
      ui.empty.replaceChildren(n === 0 ? el('span', { class: 'sf-whole', text: '0' }) : frac(D[n] - N[n], D[n]));
      ui.barFill.style.width = (100 * N[n] / D[n]) + '%';
      ui.barTxt.textContent = n === 0 ? 'all of it!' : `${N[n]} out of ${Deck.fmt(D[n])}`;
    }
    function setLadder(n) {
      ui.rungs.forEach((r, i) => { r.classList.toggle('hidden', i > n); r.classList.toggle('on', i === n); });
    }
    function setHead(n) {
      ui.stepNo.textContent = 'Step ' + n;
      ui.stepTxt.textContent = n === 0 ? 'One whole triangle. All filled in!' : n === 1 ? 'The middle falls out. 3 of 4 parts stay.' : 'Every triangle keeps 3 of its 4 parts.';
    }

    function eqStatic(n) {
      ui.eq.replaceChildren();
      ui.punch.classList.remove('show');
      if (n === 0) {
        ui.eq.append(el('div', { class: 'sf-start' }, el('span', { class: 'sf-one big', text: '1' }), el('div', { class: 'sf-start-txt', html: 'whole<br>triangle' })));
        return;
      }
      const prev = frac(N[n - 1], D[n - 1], 'prev'), q = frac(3, 4, 'q'), ans = frac(N[n], D[n], 'ans done');
      ui.eq.append(prev, el('span', { class: 'sf-op', text: '×' }), q, el('span', { class: 'sf-op', text: '=' }), ans);
      if (n === 5) ui.punch.classList.add('show');
    }

    function eqAnimate(n) {
      ui.eq.replaceChildren();
      ui.punch.classList.remove('show');
      const a = N[n - 1], b = D[n - 1];
      const prev = frac(a, b, 'prev sf-slidein'), x = el('span', { class: 'sf-op hidden', text: '×' }), q = frac(3, 4, 'q hidden');
      const eq = el('span', { class: 'sf-op hidden', text: '=' }), ans = frac('?', '?', 'ans hidden');
      ui.eq.append(prev, x, q, eq, ans);
      const [pn, , pd] = prev.children, [qn, , qd] = q.children, [an, , ad] = ans.children;
      const show = (node) => { node.classList.remove('hidden'); Deck.bump(node, 'anim-pop'); };
      Sound.sfx('slide');
      T.later(() => { show(x); show(q); Sound.sfx('pop'); }, 600);
      T.later(() => { show(eq); show(ans); }, 1000);
      T.later(() => {
        pn.classList.add('hl'); qn.classList.add('hl'); an.classList.add('hl');
        an.replaceChildren(el('small', { text: `${a}×3` })); Sound.sfx('blip');
      }, 1450);
      T.later(() => { an.textContent = N[n]; Deck.bump(an, 'sf-land'); Sound.sfx('pop'); }, 2250);
      T.later(() => {
        [pn, qn, an].forEach(e => e.classList.remove('hl'));
        pd.classList.add('hl2'); qd.classList.add('hl2'); ad.classList.add('hl2');
        ad.replaceChildren(el('small', { text: `${b}×4` })); Sound.sfx('blip');
      }, 2750);
      T.later(() => { ad.textContent = D[n]; Deck.bump(ad, 'sf-land'); Sound.sfx('pop'); }, 3550);
      T.later(() => {
        [pd, qd, ad].forEach(e => e.classList.remove('hl2'));
        ans.classList.add('done'); Deck.bump(ans, 'sf-glow'); Sound.sfx('coin');
        setCards(n); setLadder(n); Deck.bump(ui.rungs[n], 'anim-pop');
      }, 4050);
      if (n === 5) T.later(() => {
        ui.punch.classList.add('show'); Sound.sfx('fanfare'); Deck.confetti(ui.slide, 110);
        Sound.voice('tri/quarter');
      }, 5600);
    }

    /* Steps 6-9: two challenge questions over the finished picture (question, then answer). */
    function challenge(n, dir) {
      const c = n < 8 ? 1 : 2, answered = n % 2 === 1;
      ui.chal.className = `sf-chal panel show c${c}` + (answered ? ' ans' : '');
      ui.rungs.forEach((r, i) => r.classList.toggle('sf-pick', c === 1 && answered && (i === 2 || i === 3)));
      if (dir > 0) {
        Deck.bump(answered ? ui.chalAns[c - 1] : ui.chal, 'anim-pop');
        Sound.sfx(answered ? 'fanfare' : 'sparkle');
        if (answered && c === 2) Deck.confetti(ui.slide, 90);
        Sound.voice(`tri/chal-${c}${answered ? 'a' : ''}`);
      }
    }

    function show(n, dir) {
      T.clear();
      ui.falls.innerHTML = ''; ui.lines.innerHTML = '';
      if (n >= 6) {
        drawTri(5); setCards(5); setLadder(5); eqStatic(5); setHead(5);
        ui.punch.classList.remove('show');
        const prev = shown;
        shown = n;
        return challenge(n, dir > 0 && n === prev + 1 ? 1 : 0);
      }
      ui.chal.className = 'sf-chal panel';
      ui.rungs.forEach(r => r.classList.remove('sf-pick'));
      setHead(n);
      const anim = dir > 0 && n === shown + 1 && n > 0;
      shown = n;
      if (anim) {
        drawTri(n - 1); midlines(n - 1); Sound.sfx('chop');
        T.later(() => { drawTri(n); dropMiddles(n - 1); Sound.sfx('thud'); T.later(() => Sound.sfx('boing'), 120); }, 700);
        setCards(n - 1); setLadder(n - 1);
        eqAnimate(n);
      } else {
        drawTri(n); setCards(n); setLadder(n); eqStatic(n);
      }
    }

    Deck.add({
      id: 'sierpinski-fractions', music: 'space', title: 'How Much Is Left?', theme: 'sx-space sf-slide', steps: 10,
      build(root) {
        ui.slide = root;
        stars(root, 120);
        root.append(el('div', { class: 'sf-head' }, el('h1', { class: 'title', html: 'How Much Is <span class="hl">Left?</span>' })));
        const s = svg('svg', { class: 'sf-tri', viewBox: '0 0 860 740', width: 860, height: 740 });
        s.innerHTML = `<defs>
          <linearGradient id="sfGrad" x1="0" y1="0" x2="0.4" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0" stop-color="#ffe066"/><stop offset=".5" stop-color="#ff9a3c"/><stop offset="1" stop-color="#ff4f9a"/></linearGradient>
          <linearGradient id="sfGradU" x1="0" y1="${TY}" x2="300" y2="${TY + TL * SQ3}" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#ffe066"/><stop offset=".5" stop-color="#ff9a3c"/><stop offset="1" stop-color="#ff4f9a"/></linearGradient>
          <pattern id="sfStripes" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="18" height="18" fill="#1b0d3a"/><rect width="7" height="18" fill="#2a1757"/></pattern>
          <filter id="sfGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>`;
        s.append(svg('polygon', { points: P(triPts(TX, TY, TL)), class: 'sf-base' }));
        ui.fill = svg('g', { filter: 'url(#sfGlow)' });
        ui.lines = svg('g'); ui.falls = svg('g');
        s.append(ui.fill, ui.lines, ui.falls);
        root.append(s);
        root.append(el('div', { class: 'sf-legend' }, el('span', { class: 'sw on' }), 'filled', el('span', { class: 'sw off' }), 'empty'));

        ui.stepNo = el('span', { class: 'sf-stepno' }); ui.stepTxt = el('span', { class: 'sf-steptxt' });
        root.append(el('div', { class: 'sf-steprow' }, ui.stepNo, ui.stepTxt));
        ui.eq = el('div', { class: 'sf-eq' });
        root.append(ui.eq);
        ui.punch = el('div', { class: 'sf-punch panel' },
          el('div', { class: 'sf-punch-eq' }, frac(243, 1024), el('span', { class: 'sf-op', text: '≈' }), frac(256, 1024), el('span', { class: 'sf-op', text: '=' }), frac(1, 4, 'gold')),
          el('div', { class: 'sf-punch-a', html: 'Only about <b>one quarter</b> is left!' }),
          el('div', { class: 'sf-punch-b', html: 'Keep going <b>forever</b>? Filled gets<br>closer and closer to <b>0</b>… but it\'s <b>STILL a triangle!</b>' }));
        root.append(ui.punch);
        ui.filled = el('div', { class: 'sf-val' }); ui.empty = el('div', { class: 'sf-val' });
        root.append(el('div', { class: 'sf-cards' },
          el('div', { class: 'sf-card filled' }, el('div', { class: 'sf-cap', text: 'Filled' }), ui.filled),
          el('div', { class: 'sf-card empty' }, el('div', { class: 'sf-cap', text: 'Empty' }), ui.empty)));
        ui.barFill = el('div', { class: 'sf-barfill' }); ui.barTxt = el('div', { class: 'sf-bartxt' });
        root.append(el('div', { class: 'sf-bar' }, ui.barFill, ui.barTxt));
        ui.rungs = N.map((nn, i) => el('div', { class: 'sf-rung' },
          i > 0 ? el('span', { class: 'sf-times' }, '×', frac(3, 4)) : null,
          el('span', { class: 'sf-ri', text: i }),
          i === 0 ? el('span', { class: 'sf-one', text: '1' }) : frac(nn, D[i])));
        root.append(el('div', { class: 'sf-ladder' }, el('div', { class: 'kicker', text: 'Filled' }), ...ui.rungs));

        // challenges (steps 6-9)
        const op = t => el('span', { class: 'sf-op', text: t });
        ui.chalAns = [
          el('div', { class: 'sf-chal-a' },
            el('div', { class: 'sf-chal-row' }, el('b', { text: 'Step 2:' }), frac(9, 16), op('='), frac(36, 64), op('>'), frac(32, 64), el('span', { class: 'sf-chal-note', text: 'still more than half' })),
            el('div', { class: 'sf-chal-row' }, el('b', { text: 'Step 3:' }), frac(27, 64), op('<'), frac(32, 64), el('span', { class: 'sf-chal-note gold', text: 'less than half!' })),
            el('div', { class: 'sf-chal-big', html: 'STEP <span>3</span>' })),
          el('div', { class: 'sf-chal-a' },
            el('div', { class: 'sf-chal-row big' }, frac(1, 4), op('×'), frac(1, 4), op('='), frac(1, 16, 'gold')),
            el('div', { class: 'sf-chal-big', html: 'About <span>1/16</span>!' }),
            el('div', { class: 'sf-chal-note', html: 'Exactly: 59,049 out of 1,048,576. That\'s about 1/18. Close!' })),
        ];
        ui.chal = el('div', { class: 'sf-chal panel' },
          el('div', { class: 'sf-chal-q1' },
            el('div', { class: 'sf-chal-k', text: '★ CHALLENGE ★' }),
            el('div', { class: 'sf-chal-q', html: 'At which step did the filled part first drop <b>below one half</b>?' }),
            el('div', { class: 'sf-chal-hint', text: 'Hint: what is one half in sixty-fourths?  Use the ladder →' }),
            ui.chalAns[0]),
          el('div', { class: 'sf-chal-q2' },
            el('div', { class: 'sf-chal-k', text: '★ BONUS CHALLENGE ★' }),
            el('div', { class: 'sf-chal-q', html: 'About how much would be left after <b>10 steps</b>?' }),
            el('div', { class: 'sf-chal-hint', text: 'Hint: after 5 steps, about 1/4 is left. 10 steps = 5 steps, then 5 more!' }),
            ui.chalAns[1]));
        root.append(ui.chal);
      },
      enter(n) { shown = -1; },
      step(n, dir) { show(n, dir); },
      leave() { T.clear(); shown = -1; },
    });
  })();

  /* =====================================================================================
   * 4. RECURSION
   * ===================================================================================== */
  (function () {
    const T = Timers();
    let ui = {}, codeTok = 0, catTok = 0, catRaf = 0;

    /* ---------- live code + triangle ---------- */
    const CODE = [
      ['<k>to</k> <f>drawTriangle</f>(<v>size</v>):', 0],
      ['<k>if</k> <v>size</v> is <b>tiny</b>:', 1],
      ['color it in!', 2],
      ['<k>stop</k>', 2],
      ['split it into 4', 1],
      ['throw away the middle', 1],
      ['<f>drawTriangle</f>(<v>size</v> ÷ 2) <c>top</c>', 1],
      ['<f>drawTriangle</f>(<v>size</v> ÷ 2) <c>left</c>', 1],
      ['<f>drawTriangle</f>(<v>size</v> ÷ 2) <c>right</c>', 1],
    ];
    const RX = 340, RY = 16, RL = 660, MAXD = 3;
    const SPEED = [700, 340, 150, 70];
    const DOLLS = ['#ff4f5e', '#ffc93c', '#22d3c5', '#ff6fb5'];

    function* recurse(x, y, L, d, stack) {
      stack = stack.concat([d]);
      yield { line: 0, d, x, y, L, stack };
      yield { line: 1, d, x, y, L, stack };
      if (d >= MAXD) {
        yield { line: 2, d, x, y, L, stack, fill: true };
        yield { line: 3, d, x, y, L, stack };
        return;
      }
      yield { line: 4, d, x, y, L, stack, split: true };
      yield { line: 5, d, x, y, L, stack, toss: true };
      const h = L / 2;
      const kids = [[x, y], [x - h / 2, y + h * SQ3], [x + h / 2, y + h * SQ3]];
      for (let i = 0; i < 3; i++) {
        yield { line: 6 + i, d, x, y, L, stack };
        yield* recurse(kids[i][0], kids[i][1], h, d + 1, stack);
      }
    }
    function doll(size, color, i) {
      const s = svg('svg', { viewBox: '0 0 100 140', width: size * 100 / 140, height: size, class: 'sr-doll', style: `animation-delay:${-i * .2}s` });
      s.innerHTML = `<path d="M50 4c-18 0-28 13-28 30 0 9 3 15 6 20-12 9-20 25-20 43 0 25 18 39 42 39s42-14 42-39c0-18-8-34-20-43 3-5 6-11 6-20 0-17-10-30-28-30z" fill="${color}" stroke="#1d1233" stroke-width="5"/>
        <circle cx="50" cy="36" r="17" fill="#ffe8d0" stroke="#1d1233" stroke-width="4"/>
        <circle cx="44" cy="35" r="2.6" fill="#1d1233"/><circle cx="56" cy="35" r="2.6" fill="#1d1233"/>
        <circle cx="40" cy="42" r="3.5" fill="#ff8fb5" opacity=".8"/><circle cx="60" cy="42" r="3.5" fill="#ff8fb5" opacity=".8"/>
        <path d="M45 44q5 4 10 0" stroke="#1d1233" stroke-width="3" fill="none" stroke-linecap="round"/>
        <ellipse cx="50" cy="98" rx="22" ry="20" fill="#fff" opacity=".85"/><circle cx="50" cy="98" r="9" fill="${color}"/>`;
      return s;
    }
    function codeRun() {
      const tok = ++codeTok;
      ui.trFill.innerHTML = ''; ui.trLines.innerHTML = ''; ui.trFall.innerHTML = '';
      ui.cursor.setAttribute('points', P(triPts(RX, RY, RL)));
      const it = recurse(RX, RY, RL, 0, []);
      let hue = 0;
      const stepOnce = () => {
        if (tok !== codeTok) return;
        const r = it.next();
        if (r.done) {
          ui.lines.forEach(l => l.classList.remove('on'));
          ui.stack.replaceChildren(el('span', { class: 'sr-stack-done', text: 'Done!' }));
          ui.cursor.setAttribute('points', '');
          Sound.sfx('fanfare');
          T.later(() => { if (tok === codeTok) codeRun(); }, 3800);
          return;
        }
        const e = r.value;
        ui.lines.forEach((l, i) => l.classList.toggle('on', i === e.line));
        ui.base.classList.toggle('on', e.line >= 1 && e.line <= 3 && e.d >= MAXD);
        ui.cursor.setAttribute('points', P(triPts(e.x, e.y, e.L)));
        if (e.line === 0) {
          ui.stack.replaceChildren(...e.stack.map((d, i) => doll(110 - d * 20, DOLLS[d], i)));
          if (e.d < 2) Sound.sfx('blip');
        }
        if (e.split) {
          const m = midPts(e.x, e.y, e.L);
          ui.trLines.append(svg('polygon', { points: P(m), class: 'sr-mid', pathLength: 100, style: `stroke-width:${Math.max(2, 7 - e.d * 1.6)}` }));
          if (e.d < 2) Sound.sfx('chop');
        }
        if (e.toss) {
          const m = midPts(e.x, e.y, e.L);
          ui.trFall.append(svg('polygon', { points: P(m), class: 'sf-fall sr-toss', style: `--dx:${rand(-120, 120)}px;--r:${rand(-200, 200)}deg` }));
          if (e.d < 2) Sound.sfx('boing');
        }
        if (e.fill) {
          ui.trFill.append(svg('polygon', { points: P(triPts(e.x, e.y, e.L)), class: 'sr-colored', fill: `hsl(${(320 + hue * 13) % 360}, 95%, 64%)` }));
          hue++;
          Sound.sfx(hue % 3 ? 'tick' : 'pop');
        }
        T.later(stepOnce, SPEED[e.d] * (e.line === 0 && e.d === 0 ? 1.4 : 1));
      };
      T.later(stepOnce, 600);
    }

    /* ---------- the cat-in-a-frame recursion ---------- */
    const CAT_GUESS = { x: 161 / 1024, y: 661 / 1536, w: 663 / 1024, h: 401 / 1536 }; // measured from cat-frame.png; used only if pixels can't be read (file:// taint)
    let cat = null; // { img: canvas|image, w, h, hole: {x,y,w,h}, filter }

    function processImage(img) {
      const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      const c = el('canvas', { width: w, height: h });
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      let data;
      try { data = g.getImageData(0, 0, w, h); } catch (e) { return null; }
      const px = data.data, NPX = w * h, mag = new Uint8Array(NPX);
      for (let i = 0; i < NPX; i++) {
        const r = px[i * 4], gg = px[i * 4 + 1], b = px[i * 4 + 2], a = px[i * 4 + 3];
        if (a > 100 && r > 170 && b > 170 && gg < 110 && Math.abs(r - b) < 90) mag[i] = 1;
      }
      // connected magenta regions: the frame interior is the biggest one not touching the edge
      const lab = new Int32Array(NPX), q = new Int32Array(NPX);
      let best = null, id = 0;
      for (let s = 0; s < NPX; s++) {
        if (!mag[s] || lab[s]) continue;
        id++; let head = 0, tail = 0; q[tail++] = s; lab[s] = id;
        let x0 = w, y0 = h, x1 = 0, y1 = 0, edge = false, cnt = 0;
        while (head < tail) {
          const p = q[head++], x = p % w, y = (p / w) | 0; cnt++;
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true;
          const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
          for (const o of nb) if (o >= 0 && mag[o] && !lab[o]) { lab[o] = id; q[tail++] = o; }
        }
        if (!edge && cnt > NPX * .01 && (!best || cnt > best.cnt)) best = { cnt, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
      }
      if (!best) return null;
      // key out magenta (hard inside the mask, soft on the anti-aliased rim next to it)
      const near = new Uint8Array(NPX);
      for (let i = 0; i < NPX; i++) if (mag[i]) {
        const x = i % w, y = (i / w) | 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h) near[yy * w + xx] = 1;
        }
      }
      for (let i = 0; i < NPX; i++) {
        if (mag[i]) { px[i * 4 + 3] = 0; continue; }
        if (!near[i]) continue;
        const r = px[i * 4], gg = px[i * 4 + 1], b = px[i * 4 + 2];
        const m = Math.min(r, b) - gg; // how magenta-ish
        if (m > 40) { px[i * 4 + 3] = px[i * 4 + 3] * clamp(1 - (m - 40) / 140, 0, 1); px[i * 4] = px[i * 4 + 2] = Math.min(r, b, gg + 40); }
      }
      g.putImageData(data, 0, 0);
      return { img: c, w, h, hole: { x: best.x + 1, y: best.y + 1, w: best.w - 2, h: best.h - 2 } };
    }

    // Stand-in art until assets/img/cat-frame.png exists: an orange cat holding a golden frame.
    function fallbackArt() {
      const w = 800, h = 1000, c = el('canvas', { width: w, height: h }), g = c.getContext('2d');
      const orange = '#ff9a3c', dark = '#c4620f', ink = '#1d1233';
      g.lineJoin = 'round'; g.lineCap = 'round';
      // body + tail
      g.fillStyle = orange; g.strokeStyle = ink; g.lineWidth = 10;
      g.beginPath(); g.moveTo(600, 900); g.bezierCurveTo(760, 900, 780, 760, 700, 700); g.lineWidth = 34; g.strokeStyle = ink; g.stroke(); g.lineWidth = 22; g.strokeStyle = orange; g.stroke();
      g.lineWidth = 10; g.strokeStyle = ink;
      g.beginPath(); g.ellipse(400, 850, 185, 140, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#ffe2c2'; g.beginPath(); g.ellipse(400, 870, 95, 95, 0, 0, Math.PI * 2); g.fill();
      // feet
      g.fillStyle = orange;
      [[300, 975], [500, 975]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 62, 26, 0, 0, Math.PI * 2); g.fill(); g.stroke(); });
      // frame
      const fx = 110, fy = 40, fw = 580, fh = 520, b = 48;
      const gold = g.createLinearGradient(fx, fy, fx + fw, fy + fh);
      gold.addColorStop(0, '#ffe58a'); gold.addColorStop(.5, '#f2b632'); gold.addColorStop(1, '#b97a06');
      g.fillStyle = gold; g.lineWidth = 10; g.beginPath(); g.rect(fx, fy, fw, fh); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 5; g.strokeRect(fx + 14, fy + 14, fw - 28, fh - 28);
      g.fillStyle = '#ff00ff'; g.fillRect(fx + b, fy + b, fw - 2 * b, fh - 2 * b);
      g.strokeStyle = ink; g.lineWidth = 8; g.strokeRect(fx + b, fy + b, fw - 2 * b, fh - 2 * b);
      [[fx, fy], [fx + fw, fy], [fx, fy + fh], [fx + fw, fy + fh]].forEach(([x, y]) => { g.fillStyle = '#fff1b0'; g.beginPath(); g.arc(x, y, 16, 0, 7); g.fill(); g.lineWidth = 6; g.stroke(); });
      // head
      g.fillStyle = orange; g.strokeStyle = ink; g.lineWidth = 10;
      [[-1], [1]].forEach(([s]) => { g.beginPath(); g.moveTo(400 + s * 120, 650); g.lineTo(400 + s * 135, 540); g.lineTo(400 + s * 50, 610); g.closePath(); g.fill(); g.stroke(); });
      g.beginPath(); g.ellipse(400, 690, 150, 120, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.strokeStyle = dark; g.lineWidth = 12;
      [[-30], [0], [30]].forEach(([dx]) => { g.beginPath(); g.moveTo(400 + dx, 575); g.lineTo(400 + dx * .8, 610); g.stroke(); });
      // face
      g.fillStyle = ink; [[-55], [55]].forEach(([dx]) => { g.beginPath(); g.ellipse(400 + dx, 685, 20, 27, 0, 0, 7); g.fill(); });
      g.fillStyle = '#fff'; [[-48], [62]].forEach(([dx]) => { g.beginPath(); g.arc(400 + dx, 674, 8, 0, 7); g.fill(); });
      g.fillStyle = '#ff6fb5'; g.beginPath(); g.moveTo(386, 720); g.lineTo(414, 720); g.lineTo(400, 734); g.closePath(); g.fill();
      g.strokeStyle = ink; g.lineWidth = 6; g.beginPath(); g.moveTo(400, 734); g.quadraticCurveTo(388, 756, 370, 744); g.moveTo(400, 734); g.quadraticCurveTo(412, 756, 430, 744); g.stroke();
      g.fillStyle = 'rgba(255,111,181,.45)'; [[-95], [95]].forEach(([dx]) => { g.beginPath(); g.ellipse(400 + dx, 728, 24, 14, 0, 0, 7); g.fill(); });
      g.lineWidth = 4; [[-1], [1]].forEach(([s]) => { [-12, 6].forEach(o => { g.beginPath(); g.moveTo(400 + s * 120, 720 + o); g.lineTo(400 + s * 210, 708 + o * 1.6); g.stroke(); }); });
      // arms up to the frame's bottom corners
      g.lineWidth = 0;
      [[-1], [1]].forEach(([s]) => {
        g.strokeStyle = ink; g.lineWidth = 62; g.beginPath(); g.moveTo(400 + s * 150, 800); g.quadraticCurveTo(400 + s * 270, 720, 400 + s * 250, 560); g.stroke();
        g.strokeStyle = orange; g.lineWidth = 44; g.stroke();
        g.fillStyle = orange; g.strokeStyle = ink; g.lineWidth = 9; g.beginPath(); g.ellipse(400 + s * 250, 548, 40, 34, 0, 0, 7); g.fill(); g.stroke();
      });
      return c;
    }
    function loadCat() {
      const done = res => { cat = res; if (ui.catOn) catBuild(); };
      const useFallback = () => done(Object.assign(processImage(fallbackArt()), { fallback: true }));
      const img = new Image();
      img.onload = () => {
        const r = processImage(img);
        if (r) return done(r);
        // Can't read pixels (opened from file://): key the magenta with an SVG filter and guess the frame.
        const w = img.naturalWidth, h = img.naturalHeight;
        done({ img, w, h, filter: 'url(#srKey)', hole: { x: CAT_GUESS.x * w, y: CAT_GUESS.y * h, w: CAT_GUESS.w * w, h: CAT_GUESS.h * h } });
      };
      img.onerror = useFallback;
      img.src = 'assets/img/cat-frame.png';
    }

    function drawNest(g, rect, d, maxD, aNew) {
      const s = rect.w / cat.w;
      const hr = { x: rect.x + cat.hole.x * s, y: rect.y + cat.hole.y * s, w: cat.hole.w * s, h: cat.hole.h * s };
      if (d < maxD && hr.w > 2) {
        g.save();
        if (d + 1 === maxD) g.globalAlpha = aNew;
        g.beginPath(); g.rect(hr.x, hr.y, hr.w, hr.h); g.clip();
        const wall = g.createRadialGradient(hr.x + hr.w / 2, hr.y + hr.h * .35, 0, hr.x + hr.w / 2, hr.y + hr.h / 2, Math.max(hr.w, hr.h) * .75);
        wall.addColorStop(0, '#3b1a72'); wall.addColorStop(1, '#140b2e');
        g.fillStyle = wall; g.fillRect(hr.x, hr.y, hr.w, hr.h);
        const r = Math.min(hr.w / cat.w, hr.h / cat.h) * .94;
        const iw = cat.w * r, ih = cat.h * r;
        let inner = { x: hr.x + (hr.w - iw) / 2, y: hr.y + hr.h - ih - hr.h * .015, w: iw, h: ih };
        if (d + 1 === maxD) { const sc = .7 + .3 * aNew, cx = inner.x + iw / 2, cy = inner.y + ih / 2; inner = { x: cx - iw * sc / 2, y: cy - ih * sc / 2, w: iw * sc, h: ih * sc }; }
        drawNest(g, inner, d + 1, maxD, aNew);
        g.restore();
      }
      if (cat.filter) g.filter = cat.filter;
      g.drawImage(cat.img, rect.x, rect.y, rect.w, rect.h);
      g.filter = 'none';
    }
    function catLayout() {
      const sc = Math.min(1000 / cat.w, 900 / cat.h);
      const rect = { x: (1000 - cat.w * sc) / 2, y: 900 - cat.h * sc, w: cat.w * sc, h: cat.h * sc };
      // the inner copy, placed exactly as drawNest places it -> the similarity map rect -> inner
      const s0 = rect.w / cat.w, hw = cat.hole.w * s0, hh = cat.hole.h * s0;
      const a = Math.min(hw / cat.w, hh / cat.h) * .94;      // inner copy's scale (screen px per image px)
      const r = cat.w * a / rect.w;                          // inner size / outer size
      const ix = rect.x + cat.hole.x * s0 + (hw - cat.w * a) / 2, iy = rect.y + cat.hole.y * s0 + hh - cat.h * a - hh * .015;
      const F = { x: (ix - r * rect.x) / (1 - r), y: (iy - r * rect.y) / (1 - r) };  // the zoom's fixed point
      const MAX = clamp(Math.floor(Math.log(6 / rect.w) / Math.log(r)), 3, 8);
      return { rect, r, F, MAX };
    }
    function catBuild() {
      const tok = ++catTok;
      cancelAnimationFrame(catRaf);
      ui.catCanvas.classList.remove('dive'); ui.dive.classList.remove('on');
      const c = ui.catCanvas, g = c.getContext('2d');
      const kk = c.width / 1000;
      const { rect, MAX } = catLayout();
      let level = 0, t0 = performance.now();
      const frame = now => {
        if (tok !== catTok) return;
        const a = clamp((now - t0) / 380, 0, 1);
        g.setTransform(kk, 0, 0, kk, 0, 0); g.clearRect(0, 0, 1000, 900);
        drawNest(g, rect, 0, level, Deck.ease(a));
        if (a >= 1 && level < MAX && now - t0 > 600) {
          level++; t0 = now;
          ui.catLevel.textContent = level;
          Deck.bump(ui.catBadge, 'anim-pop');
          Sound.sfx(level === MAX ? 'sparkle' : 'pop');
        }
        if (level < MAX || a < 1) catRaf = requestAnimationFrame(frame);
      };
      ui.catLevel.textContent = 0;
      catRaf = requestAnimationFrame(frame);
    }
    // Endless zoom into the frame: a homothety about the fixed point F, wrapping every level so it never ends.
    function catDive() {
      if (ui.catCanvas.classList.contains('dive')) return catBuild();
      const tok = ++catTok;
      cancelAnimationFrame(catRaf);
      ui.catCanvas.classList.add('dive'); ui.dive.classList.add('on');
      Sound.sfx('whoosh');
      const c = ui.catCanvas, g = c.getContext('2d'), kk = c.width / 1000;
      const { rect, r, F, MAX } = catLayout();
      let depth = MAX, t = 0, last = performance.now();
      const frame = now => {
        if (tok !== catTok) return;
        const dt = Math.min(.05, (now - last) / 1000); last = now;
        const ramp = Math.min(1, t + (depth - MAX));   // ease in on the first level
        t += dt / 2.2 * (.35 + .65 * ramp);
        if (t >= 1) { t -= 1; depth++; ui.catLevel.textContent = depth; Deck.bump(ui.catBadge, 'anim-pop'); Sound.sfx('blip'); }
        g.setTransform(kk, 0, 0, kk, 0, 0);
        const wall = g.createRadialGradient(500, 380, 0, 500, 450, 700);
        wall.addColorStop(0, '#3b1a72'); wall.addColorStop(1, '#140b2e');
        g.fillStyle = wall; g.fillRect(0, 0, 1000, 900);
        const z = Math.pow(r, -2 - t);  // start two levels "outside" so the edges are always covered
        drawNest(g, { x: F.x + (rect.x - F.x) * z, y: F.y + (rect.y - F.y) * z, w: rect.w * z, h: rect.h * z }, 0, 99, 1);
        catRaf = requestAnimationFrame(frame);
      };
      catRaf = requestAnimationFrame(frame);
    }

    /* ---------- scenes ---------- */
    function scene(n) {
      const sc = n <= 2 ? 'a' : n === 3 ? 'b' : 'c';
      ['a', 'b', 'c'].forEach(s => ui['scene_' + s].classList.toggle('on', s === sc));
      ui.scene_a.classList.toggle('s0', n === 0);
      ui.sub.innerHTML = sc === 'a' ? 'A recipe that uses <b>ITSELF!</b>' : sc === 'b' ? 'The recipe, written as <b>code</b>' : 'A picture of <b>ITSELF!</b>';
      if (sc === 'b') { if (ui.codeOn !== true) { ui.codeOn = true; codeRun(); } }
      else { ui.codeOn = false; codeTok++; }
      if (sc === 'c') { if (!ui.catOn) { ui.catOn = true; if (cat) catBuild(); T.later(() => Sound.voice('tri/cat'), 400); } }
      else { ui.catOn = false; catTok++; cancelAnimationFrame(catRaf); }
      if (n === 2) T.later(() => Sound.voice('tri/forever'), 1400);
    }

    function spiral() {
      const s = svg('svg', { viewBox: '-260 -260 520 520', class: 'sr-spiral' });
      const g = svg('g', { class: 'sr-spin' });
      const words = ['draw a triangle', 'in each corner', 'draw a triangle', 'in each corner'];
      for (let i = 0; i < 46; i++) {
        const th = i * .52, r = 235 * Math.exp(-th * .135);
        const x = Math.cos(th) * r, y = Math.sin(th) * r, size = r / 5.2;
        const t = svg('g', { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(th * 180 / Math.PI + 90).toFixed(1)})` });
        if (i % 2) t.append(svg('polygon', { points: P(triPts(0, -size * .9, size * 1.6)), fill: `hsl(${(i * 23) % 360},95%,65%)` }));
        else t.append(svg('text', { 'font-size': size.toFixed(1), 'text-anchor': 'middle', fill: `hsl(${(i * 23) % 360},95%,75%)` }, document.createTextNode('again!')));
        g.append(t);
      }
      s.append(g);
      return s;
    }

    Deck.add({
      id: 'recursion', music: 'space', title: 'Recursion', theme: 'sx-space sr-slide', steps: 5,
      build(root) {
        ui.slide = root;
        stars(root, 140);
        root.insertAdjacentHTML('beforeend', `<svg width="0" height="0" style="position:absolute"><filter id="srKey" color-interpolation-filters="sRGB">
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -4 4 -4 0 8"/></filter></svg>`);
        ui.sub = el('div', { class: 'sr-sub' });
        root.append(el('div', { class: 'sr-head' }, el('div', { class: 'kicker', text: 'A computer science idea' }), el('h1', { class: 'title', html: 'Re<span class="hl">cur</span>sion' }), ui.sub));

        /* scene A: recipe, stopping rule, the forever gag */
        const tri = (cls) => { const s = svg('svg', { viewBox: '0 0 100 90', class: 'sr-ico ' + cls }); return s; };
        const ico1 = tri(''); ico1.innerHTML = `<polygon points="${P(triPts(50, 4, 92))}" class="ii"/><polygon points="${P(midPts(50, 4, 92))}" class="il"/>`;
        const ico2 = tri(''); ico2.innerHTML = `<polygon points="${P(triPts(50, 4, 46))}" class="ii"/><polygon points="${P(triPts(27, 4 + 23 * SQ3 * 2, 46))}" class="ii"/><polygon points="${P(triPts(73, 4 + 23 * SQ3 * 2, 46))}" class="ii"/><polygon points="${P(midPts(50, 4, 92))}" class="io"/>`;
        const ico3 = tri(''); ico3.innerHTML = [[50, 4, 46], [27, 4 + 46 * SQ3, 46], [73, 4 + 46 * SQ3, 46]].map(c => [[c[0], c[1], c[2] / 2], [c[0] - c[2] / 4, c[1] + c[2] / 2 * SQ3, c[2] / 2], [c[0] + c[2] / 4, c[1] + c[2] / 2 * SQ3, c[2] / 2]].map(t => `<polygon points="${P(triPts(...t))}" class="ii"/>`).join('')).join('');
        ui.scene_a = el('div', { class: 'sr-scene sr-a' },
          el('div', { class: 'sr-dict panel', 'data-at': 0 },
            el('div', { class: 'sr-dict-word', html: 're·cur·sion <i>(noun)</i>' }),
            el('div', { class: 'sr-dict-def', html: 'See: <u>recursion</u>.' }),
            el('div', { class: 'sr-dict-note', text: '…wait. Get it?!' }),
            el('div', { class: 'sr-dict-loop', html: '&#8635;' })),
          el('div', { class: 'sr-recipe panel', 'data-at': 1 },
            el('div', { class: 'sr-card-h', text: 'To draw a Sierpinski triangle:' }),
            el('ol', {},
              el('li', {}, ico1, el('span', { html: '<b>Split</b> it into 4' })),
              el('li', {}, ico2, el('span', { html: '<b>Throw away</b> the middle' })),
              el('li', { class: 'self' }, ico3, el('span', { html: 'Draw a <b>Sierpinski triangle</b> in each corner' }))),
            el('div', { class: 'sr-itself', html: 'It uses <b>ITSELF!</b>' })),
          el('div', { class: 'sr-stop panel', 'data-at': 2 },
            el('div', { class: 'sr-stopsign', html: '<span>STOP</span>' }),
            el('div', {},
              el('div', { class: 'sr-card-h', text: 'The stopping rule:' }),
              el('div', { class: 'sr-stop-txt', html: '…<b>unless</b> the triangle is <b>tiny</b>.<br>Then just color it in!' }))),
          el('div', { class: 'sr-forever', 'data-at': 2 },
            el('div', { class: 'sr-forever-h', text: 'No stopping rule?' }),
            spiral(),
            el('div', { class: 'sr-forever-t', html: 'FOREVER!' }),
            el('div', { class: 'sr-forever-s', text: 'The computer would never, ever finish.' })));
        root.append(ui.scene_a);

        /* scene B: code + live triangle */
        ui.lines = CODE.map(([html, ind]) => el('div', { class: 'sr-line', style: `--ind:${ind}`, html }));
        ui.base = el('div', { class: 'sr-base' }, el('div', { class: 'sr-base-tag', text: 'STOPPING RULE' }), ...ui.lines.slice(1, 4));
        const tsvg = svg('svg', { viewBox: '0 0 680 620', class: 'sr-live' });
        tsvg.append(svg('polygon', { points: P(triPts(RX, RY, RL)), class: 'sr-ghost' }));
        ui.trFill = svg('g'); ui.trLines = svg('g'); ui.trFall = svg('g');
        ui.cursor = svg('polygon', { class: 'sr-cursor' });
        tsvg.append(ui.trFill, ui.trLines, ui.trFall, ui.cursor);
        ui.stack = el('div', { class: 'sr-stack' });
        ui.scene_b = el('div', { class: 'sr-scene sr-b' },
          el('div', { class: 'sr-code panel' }, ui.lines[0], ui.base, ...ui.lines.slice(4)),
          tsvg,
          el('div', { class: 'sr-stackbox' }, el('div', { class: 'sr-stack-h', text: 'Calls inside calls, like nesting dolls:' }), ui.stack));
        root.append(ui.scene_b);

        /* scene C: cat recursion */
        ui.catCanvas = el('canvas', { class: 'sr-cat', width: 1000, height: 900 });
        ui.catLevel = el('b', { text: '0' });
        ui.catBadge = el('div', { class: 'sr-catbadge' }, 'levels deep: ', ui.catLevel);
        const words = el('div', { class: 'sr-catwords' });
        ['A cat holding', 'a picture of a cat holding', 'a picture of a cat holding', 'a picture of a cat holding', 'a picture of a cat…'].forEach((t, i) =>
          words.append(el('div', { text: t, style: `font-size:${Math.round(56 * Math.pow(.8, i))}px;opacity:${1 - i * .13}` })));
        ui.scene_c = el('div', { class: 'sr-scene sr-c' },
          words,
          el('div', { class: 'sr-catcode panel', html: '<k>to</k> <f>drawCat</f>(<v>size</v>):<br>&nbsp;&nbsp;draw the cat &amp; frame<br>&nbsp;&nbsp;<k>if</k> <v>size</v> is <b>tiny</b>: <k>stop</k><br>&nbsp;&nbsp;<f>drawCat</f>(<v>smaller</v>) in the frame' }),
          ui.catCanvas, ui.catBadge,
          el('div', { class: 'sr-catbtns' },
            ui.dive = el('button', { class: 'btn small teal', html: '&#10148; Dive in!', onclick: () => { if (cat) catDive(); } }),
            el('button', { class: 'btn small', html: '&#8635; Again', onclick: () => { if (cat) catBuild(); } })));
        root.append(ui.scene_c);
        loadCat();
      },
      enter() { const kk = clamp(Deck.scale * (window.devicePixelRatio || 1), 1, 2); ui.catCanvas.width = 1000 * kk; ui.catCanvas.height = 900 * kk; ui.catOn = false; ui.codeOn = false; },
      step(n) { T.clear(); Deck.reveal(ui.scene_a, n); scene(n); if (n > 0) Sound.sfx('pop'); },
      leave() { T.clear(); codeTok++; catTok++; cancelAnimationFrame(catRaf); ui.catOn = false; ui.codeOn = false; },
    });
  })();
})();
