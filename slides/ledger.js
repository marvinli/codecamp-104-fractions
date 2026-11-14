/* Slide: "Fractions at Work". Mr. Pennington P. Ledger III, an extremely serious accountant, presents
   the Quarterly Fraction Report: the class picks any fraction and the easel shows it seven ways. */
(function () {
  const { el, svg: S, art, tween, bump, clamp } = Deck;
  const MAXD = 24;
  const INK = '#1d1233';

  /* Every voice line. The bubble shows exactly this text; tools render assets/audio/voice/<key>.mp3.
     (Mirrored in assets/audio/voice/ledger-lines.json.) */
  const LINES = {
    'ledger/intro': "Good morning. I am Pennington P. Ledger the Third. Accountant.",
    'ledger/tab_bar': "Exhibit A. A loading bar. Please contain your excitement.",
    'ledger/tab_pie': "Behold. A circle of fiscal responsibility. Do not eat it.",
    'ledger/tab_choc': "A rectangle, divided into equal pieces. Strictly for research.",
    'ledger/tab_cats': "Orange cats are counted. Green cats are not. Very orderly.",
    'ledger/tab_hero': "A hero's health, as a fraction. I find this rather violent.",
    'ledger/tab_boba': "Liquid assets. A beverage, measured with the utmost precision.",
    'ledger/tab_battery': "My telephone battery. Fractions tell me when to panic. Quietly.",
    'ledger/tab_all': "Seven pictures. One number. Fractions help us see numbers.",
    'ledger/zero1': "Zero?! Nothing at all?! This is a fiscal catastrophe!",
    'ledger/zero2': "Zero. The most dreadful number. Fetch my smelling salts.",
    'ledger/whole1': "All of it! One whole! I may actually smile.",
    'ledger/whole2': "Every piece accounted for! Best day of my entire life!",
    'ledger/half': "Exactly one half. Perfectly balanced. Like my checkbook.",
    'ledger/tiny1': "A mere sliver. Technically a number. Barely.",
    'ledger/tiny2': "Hardly anything. I have seen bigger crumbs.",
    'ledger/low1': "Less than half. I shall make a note of that.",
    'ledger/low2': "Under half. Mildly disappointing. Like decaf tea.",
    'ledger/high1': "More than half. Acceptable. Mildly acceptable.",
    'ledger/high2': "Over half. My monocle is almost impressed.",
    'ledger/nearly': "So close to a whole. The suspense is unbearable.",
    'ledger/simplify1': "That fraction can be simplified. How deliciously tidy.",
    'ledger/simplify2': "Equivalent fractions! Same amount, different paperwork.",
    'ledger/improper': "Improper! More pieces than the whole? Most irregular!",
    'ledger/divzero': "Zero pieces? Dividing by zero is strictly forbidden!",
    'ledger/toobig': "Twenty-four pieces maximum. Company policy. Very strict.",
    'ledger/negative': "Negative pieces? We do not do debt in this office.",
  };

  const CATS = {
    zero: ['ledger/zero1', 'ledger/zero2'], whole: ['ledger/whole1', 'ledger/whole2'], half: ['ledger/half'],
    tiny: ['ledger/tiny1', 'ledger/tiny2'], low: ['ledger/low1', 'ledger/low2'], high: ['ledger/high1', 'ledger/high2'],
    nearly: ['ledger/nearly'], simplify: ['ledger/simplify1', 'ledger/simplify2'],
  };
  const CAT_POSE = { zero: 'horrified', whole: 'delighted', half: 'lecture', tiny: 'unimpressed', low: 'unimpressed', high: 'lecture', nearly: 'lecture', simplify: 'lecture' };

  const st = { n: 3, d: 8, view: 'pie' };
  let root, ui = {}, mainInst = null, gridInsts = [], gridFrac = null, active = false;
  let lastCat = null, lastKey = null, poseNow = 'lecture', voiceOK = false, uid = 0;
  let typeTimer = null, commentTimer = null, inputTimer = null, shufTok = 0, lastScold = { key: null, t: 0 };
  const timers = new Set(), stoppers = [];

  /* ---------------- helpers ---------------- */
  function later(fn, ms) { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; }
  function play(name, quiet) { if (!quiet && active) Sound.sfx(name); }
  function T(x, y, txt, cls, attrs) { const t = S('text', Object.assign({ x, y, class: cls }, attrs || {})); t.textContent = txt; return t; }
  function origin(node, o = 'center', box = 'fill-box') { node.style.transformBox = box; node.style.transformOrigin = o; return node; }
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  function pctNum(n, d) { const p = n / d * 100, r = Math.round(p * 10) / 10; return { exact: Math.abs(p - r) < 1e-9, txt: (r % 1 === 0 ? r.toFixed(0) : r.toFixed(1)) + '%' }; }
  function pctStr(n, d) { const p = pctNum(n, d); return (p.exact ? '= ' : '≈ ') + p.txt; }

  /* ================= VISUALIZATIONS =================
     Each factory(host, quiet) draws an SVG into host and returns { update(n, d, prev) }.
     prev = previous {n, d}, or null for a fresh draw (plays the entrance animation). */

  /* ---- 1. Loading bar ---- */
  function vBar(host, quiet) {
    const id = 'lgb' + (++uid);
    const X = 70, Y = 150, BW = 760, BH = 96;
    const clipR = S('rect', { x: X, y: Y, width: 0, height: BH, rx: 20 });
    const ticks = S('g');
    const pctT = T(830, 312, '0%', 'lg-t-display', { 'text-anchor': 'end', 'font-size': 60, fill: INK });
    const cntT = T(72, 300, '', 'lg-t-body', { 'font-size': 32, fill: '#4a4560', 'font-weight': 600 });
    const statT = T(72, 128, '', 'lg-t-body', { 'font-size': 26, fill: '#6b6680', 'font-style': 'italic' });
    const stripes = S('rect', { x: X - 120, y: Y, width: BW + 240, height: BH, fill: `url(#${id}p)` });
    stripes.append(S('animateTransform', { attributeName: 'transform', type: 'translate', from: '0 0', to: '56.57 0', dur: '0.7s', repeatCount: 'indefinite' }));
    const green = S('rect', { x: X, y: Y, width: BW, height: BH, fill: '#36d27a' });
    const winBtn = (x, c) => S('rect', { x, y: 40, width: 30, height: 30, rx: 6, fill: c, stroke: INK, 'stroke-width': 3 });
    host.append(S('svg', { viewBox: '0 0 900 360', class: 'lg-viz' },
      S('defs', null,
        S('pattern', { id: id + 'p', width: 40, height: 40, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
          S('rect', { width: 20, height: 40, fill: 'rgba(255,255,255,.3)' })),
        S('clipPath', { id: id + 'c' }, clipR)),
      S('rect', { x: 26, y: 32, width: 860, height: 316, rx: 22, fill: 'rgba(29,18,51,.18)' }),
      S('rect', { x: 20, y: 20, width: 860, height: 316, rx: 22, fill: '#f4f1ea' }),
      S('path', { d: 'M20 90 V42 a22 22 0 0 1 22-22 H858 a22 22 0 0 1 22 22 V90 Z', fill: '#2f5bd3' }),
      T(48, 66, 'Downloading:  fractions.zip', 'lg-t-body', { 'font-size': 30, 'font-weight': 700, fill: '#fff' }),
      winBtn(752, '#ffc93c'), winBtn(792, '#9be15d'), winBtn(832, '#ff4f5e'),
      S('rect', { x: 20, y: 20, width: 860, height: 316, rx: 22, fill: 'none', stroke: INK, 'stroke-width': 6 }),
      statT,
      S('rect', { x: X, y: Y, width: BW, height: BH, rx: 20, fill: '#dcdfe8' }),
      S('g', { 'clip-path': `url(#${id}c)` }, green, stripes, S('rect', { x: X + 10, y: Y + 10, width: BW - 20, height: 16, rx: 8, fill: 'rgba(255,255,255,.4)' })),
      ticks,
      S('rect', { x: X, y: Y, width: BW, height: BH, rx: 20, fill: 'none', stroke: INK, 'stroke-width': 6 }),
      cntT, pctT));
    let w = 0, tok = 0;
    return {
      update(n, d, prev) {
        if (!prev || prev.d !== d) {
          ticks.textContent = '';
          for (let i = 1; i < d; i++) {
            const x = X + BW * i / d;
            ticks.append(S('line', { x1: x, x2: x, y1: Y + 6, y2: Y + BH - 6, stroke: INK, 'stroke-width': 3, 'stroke-dasharray': '7 6', opacity: .45 }));
          }
        }
        if (!prev) w = 0;
        const target = BW * n / d, from = w, my = ++tok;
        cntT.textContent = `${n} of ${d} piece${d === 1 ? '' : 's'} downloaded`;
        statT.textContent = n === d ? 'Download complete! Enjoy your fraction.'
          : n === 0 ? 'Waiting to start... (this may take forever)'
          : `Time remaining: about ${d - n} business day${d - n === 1 ? '' : 's'}`;
        green.setAttribute('fill', n === d ? '#2bc46c' : '#36d27a');
        tween(800, t => {
          if (my !== tok) return;
          w = from + (target - from) * t;
          clipR.setAttribute('width', Math.max(0, w));
          pctT.textContent = Math.floor(w / BW * 100 + 1e-6) + '%';
        }).then(() => { if (my === tok) pctT.textContent = pctNum(n, d).txt; });
        if (prev) play(n === d ? 'ding' : 'slide', quiet);
      },
    };
  }

  /* ---- 2. Pie: the circle of fiscal responsibility ---- */
  function vPie(host, quiet) {
    const C = 220, R = 186;
    const g = S('g');
    host.append(S('svg', { viewBox: '0 0 440 450', class: 'lg-viz' },
      S('ellipse', { cx: C, cy: C + 16, rx: R + 10, ry: R + 6, fill: 'rgba(29,18,51,.16)' }), g));
    let slices = [];
    const wedge = (i, d) => {
      const a0 = -Math.PI / 2 + i / d * 2 * Math.PI, a1 = -Math.PI / 2 + (i + 1) / d * 2 * Math.PI;
      const p = (a) => `${(C + R * Math.cos(a)).toFixed(2)} ${(C + R * Math.sin(a)).toFixed(2)}`;
      return `M${C} ${C} L${p(a0)} A${R} ${R} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)} Z`;
    };
    return {
      update(n, d, prev) {
        const rebuild = !prev || prev.d !== d || !slices.length;
        if (rebuild) {
          g.textContent = ''; slices = [];
          for (let i = 0; i < d; i++) {
            const p = d === 1 ? S('circle', { cx: C, cy: C, r: R }) : S('path', { d: wedge(i, d) });
            p.setAttribute('stroke', INK); p.setAttribute('stroke-width', d > 12 ? 3 : 5); p.setAttribute('stroke-linejoin', 'round');
            origin(p, `${C}px ${C}px`, 'view-box');
            g.append(p);
            const mid = -Math.PI / 2 + (i + .5) / d * 2 * Math.PI;
            slices.push({ p, dx: d > 1 ? Math.cos(mid) * 9 : 0, dy: d > 1 ? Math.sin(mid) * 9 : 0, on: null });
            p.animate([{ transform: 'scale(0) rotate(-40deg)', opacity: 0 }, { transform: 'scale(1) rotate(0)', opacity: 1 }],
              { duration: 480, delay: i * 45, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'backwards' });
          }
          if (!quiet) for (let i = 0; i < Math.min(d, 10); i++) later(() => play('pop'), i * Math.max(45, d * 45 / 10));
        }
        let k = 0;
        slices.forEach((s, i) => {
          const on = i < n;
          s.p.setAttribute('fill', on ? '#ffc93c' : '#fffaf0');
          const rest = on ? `translate(${s.dx}px, ${s.dy}px)` : 'translate(0px, 0px)';
          s.p.style.transform = rest;
          if (s.on !== on) {
            const delay = (rebuild ? d * 45 + 200 : 0) + k * 60;
            if (on) {
              s.p.animate([{ transform: 'translate(0px, 0px) scale(1)' }, { transform: `translate(${s.dx * 3}px, ${s.dy * 3}px) scale(1.12)`, offset: .45 }, { transform: rest + ' scale(1)' }],
                { duration: 520, delay, easing: 'ease-out', fill: 'backwards' });
              if (!rebuild && k < 8) later(() => play('pop', quiet), delay);
            } else if (!rebuild) {
              s.p.animate([{ transform: `translate(${s.dx}px, ${s.dy}px) scale(1)` }, { transform: 'scale(.86)', offset: .4 }, { transform: 'scale(1)' }], { duration: 380, delay });
            }
            k++;
          }
          s.on = on;
        });
      },
    };
  }

  /* ---- 3. Divided rectangle: a chocolate bar ---- */
  function gridFor(d, W, H) {
    let best = null;
    for (let r = 1; r <= d; r++) {
      if (d % r) continue;
      const c = d / r; if (r > c) break;
      const score = Math.abs(Math.log((W / c) / (H / r)));
      if (!best || score < best.score) best = { r, c, score };
    }
    return best;
  }
  function vChoc(host, quiet) {
    const BX = 70, BY = 46, BW = 760, BH = 320;
    const g = S('g');
    host.append(S('svg', { viewBox: '0 0 900 420', class: 'lg-viz' },
      S('rect', { x: BX - 22, y: BY - 18, width: BW + 44, height: BH + 36, rx: 16, fill: 'rgba(29,18,51,.16)', transform: 'translate(8 10)' }),
      S('path', { d: `M${BX - 22} ${BY - 18} h${BW * .32} l-30 ${BH + 36} h${-(BW * .32 - 30)} z`, fill: '#c4202f', stroke: INK, 'stroke-width': 5 }),
      S('rect', { x: BX - 10, y: BY - 8, width: BW + 20, height: BH + 16, rx: 12, fill: '#2b140a', stroke: INK, 'stroke-width': 5 }),
      g,
      S('path', { d: `M${BX + BW - 84} ${BY - 18} H${BX + BW + 22} V${BY + BH + 18} H${BX + BW - 64} Z`, fill: '#d8dce4', stroke: INK, 'stroke-width': 5, 'stroke-linejoin': 'round' }),
      S('path', { d: `M${BX + BW - 60} ${BY - 14} l14 ${BH + 28}`, stroke: '#ffffff', 'stroke-width': 9, opacity: .8 }),
      T(BX + BW - 14, BY + BH / 2 + 10, 'FOIL', 'lg-t-display', { 'font-size': 26, fill: '#8d93a3', 'text-anchor': 'middle', transform: `rotate(90 ${BX + BW - 14} ${BY + BH / 2})` })));
    let pieces = [];
    const AREA_W = BW - 96;
    return {
      update(n, d, prev) {
        const rebuild = !prev || prev.d !== d || !pieces.length;
        if (rebuild) {
          g.textContent = ''; pieces = [];
          const { r, c } = gridFor(d, AREA_W, BH);
          const pw = AREA_W / c, ph = BH / r, gap = Math.min(10, pw * .12, ph * .12);
          for (let i = 0; i < d; i++) {
            const x = BX + (i % c) * pw + gap / 2, y = BY + Math.floor(i / c) * ph + gap / 2, w = pw - gap, h = ph - gap;
            const ins = Math.min(9, w * .14, h * .14);
            const outer = S('rect', { x, y, width: w, height: h, rx: Math.min(8, w * .1) });
            const inner = S('rect', { x: x + ins, y: y + ins, width: w - 2 * ins, height: h - 2 * ins, rx: Math.min(6, w * .08) });
            const shine = S('rect', { x: x + ins + 3, y: y + ins + 3, width: Math.max(2, (w - 2 * ins) * .5), height: Math.max(2, Math.min(8, h * .06)), rx: 3, fill: 'rgba(255,255,255,.28)' });
            const pg = origin(S('g', null, outer, inner, shine));
            g.append(pg);
            pieces.push({ pg, outer, inner, on: null });
            pg.animate([{ transform: 'translateY(-60px) scale(.7)', opacity: 0 }, { transform: 'none', opacity: 1 }],
              { duration: 420, delay: i * 35, easing: 'cubic-bezier(.3,1.5,.5,1)', fill: 'backwards' });
          }
          if (!quiet) later(() => play('chop'), 120);
        }
        let k = 0;
        pieces.forEach((p, i) => {
          const on = i < n;
          p.outer.setAttribute('fill', on ? '#5c2c12' : '#e9dcc4');
          p.inner.setAttribute('fill', on ? '#8a4a22' : '#fff8ea');
          p.outer.setAttribute('stroke', on ? '#3a1a08' : '#cdbb9c'); p.outer.setAttribute('stroke-width', 2);
          if (!rebuild && p.on !== on) {
            p.pg.animate([{ transform: 'scale(1)' }, { transform: on ? 'scale(1.14) rotate(-3deg)' : 'scale(.85)', offset: .4 }, { transform: 'scale(1)' }],
              { duration: 420, delay: k * 50, easing: 'ease-out' });
            k++;
          }
          p.on = on;
        });
        if (!rebuild && k) play('chop', quiet);
      },
    };
  }

  /* ---- 4. Cats: orange ones count, green ones don't ---- */
  function catFallback(color) {
    return S('g', { class: 'lg-cat-fb' },
      S('path', { d: 'M22 38 L28 8 L48 28 Z M88 38 L82 8 L62 28 Z', fill: color, stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }),
      S('ellipse', { cx: 55, cy: 58, rx: 38, ry: 34, fill: color, stroke: INK, 'stroke-width': 4 }),
      S('circle', { cx: 41, cy: 54, r: 5, fill: INK }), S('circle', { cx: 69, cy: 54, r: 5, fill: INK }),
      S('path', { d: 'M50 66 h10 l-5 6 z', fill: '#ff6fb5' }),
      S('path', { d: 'M40 76 q7 6 15 0 q8 6 15 0', fill: 'none', stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round' }));
  }
  function catCols(d) {
    if (d <= 4) return d;
    let best = null;
    for (let c = Math.ceil(Math.sqrt(1.4 * d)); c <= Math.ceil(Math.sqrt(3.2 * d)); c++) {
      const empty = c * Math.ceil(d / c) - d, score = empty * 2 + Math.abs(c - Math.sqrt(2.1 * d));
      if (!best || score < best.score) best = { c, score };
    }
    return best.c;
  }
  function vCats(host, quiet) {
    const s = S('svg', { class: 'lg-viz' });
    host.append(s);
    let cats = [];
    const CELL = 112;
    return {
      update(n, d, prev) {
        const rebuild = !prev || prev.d !== d || !cats.length;
        if (rebuild) {
          s.textContent = ''; cats = [];
          const c = catCols(d), r = Math.ceil(d / c);
          const vw = Math.max(c * CELL, 3 * CELL), vh = Math.max(r * CELL, 1.5 * CELL);
          const ox = (vw - c * CELL) / 2, oy = (vh - r * CELL) / 2;
          s.setAttribute('viewBox', `-6 -6 ${vw + 12} ${vh + 12}`);
          for (let i = 0; i < d; i++) {
            const row = Math.floor(i / c), col = i % c;
            const rowCount = row === r - 1 ? d - row * c : c; // center the last row
            const x = ox + col * CELL + (c - rowCount) * CELL / 2, y = oy + row * CELL;
            const orange = S('image', { href: 'assets/img/cat-orange.png', x: 0, y: 0, width: 110, height: 110, class: 'lg-cat-img' });
            const green = S('image', { href: 'assets/img/cat-green.png', x: 0, y: 0, width: 110, height: 110, class: 'lg-cat-img' });
            [orange, green].forEach(im => im.addEventListener('error', () => { im.style.display = 'none'; }));
            const fbO = catFallback('#ff9a3c'), fbG = catFallback('#7fd35a');
            fbO.classList.add('lg-fb-orange'); fbG.classList.add('lg-fb-green');
            const inner = origin(S('g', null, S('ellipse', { cx: 55, cy: 104, rx: 34, ry: 6, fill: 'rgba(29,18,51,.15)' }), fbO, fbG, orange, green), 'center bottom');
            s.append(S('g', { transform: `translate(${x} ${y})` }, inner));
            cats.push({ inner, orange, green, fbO, fbG, on: null });
            inner.animate([
              { transform: 'translateY(-420px) scale(.7, 1.2)', opacity: 0 },
              { transform: 'translateY(0) scale(1.25, .7)', opacity: 1, offset: .6 },
              { transform: 'translateY(-26px) scale(.92, 1.1)', offset: .8 },
              { transform: 'none' }],
              { duration: 620, delay: i * 75, easing: 'ease-in', fill: 'backwards' });
            if (!quiet) later(() => play(i < n ? 'pop' : 'blip'), i * 75 + 370);
          }
        }
        let k = 0;
        cats.forEach((c, i) => {
          const on = i < n;
          c.orange.style.opacity = c.fbO.style.opacity = on ? 1 : 0;
          c.green.style.opacity = c.fbG.style.opacity = on ? 0 : 1;
          if (!rebuild && c.on !== on) {
            c.inner.animate([{ transform: 'none' }, { transform: 'translateY(-40px) scale(1.2) rotate(-14deg)', offset: .35 }, { transform: 'scale(.9, 1.1)', offset: .7 }, { transform: 'none' }],
              { duration: 520, delay: k * 70, easing: 'ease-out' });
            if (k < 8) later(() => play(on ? 'boing' : 'pop', quiet), k * 70);
            k++;
          }
          c.on = on;
        });
      },
    };
  }

  /* ---- 5. Hero health bar ---- */
  const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
  const heartCache = {};
  function heartPaths(px) {
    if (heartCache[px]) return heartCache[px];
    const F = new Set();
    HEART.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === 'X') F.add((r + 1) + ',' + (c + 1)); }));
    const sq = (r, c) => `M${c * px} ${r * px}h${px}v${px}h${-px}z`;
    const out = { line: '', fill: '', hi: '', shade: '' };
    for (let r = 0; r < 8; r++) for (let c = 0; c < 9; c++) {
      const k = r + ',' + c;
      if (F.has(k)) {
        if ((r === 2 && (c === 2 || c === 3)) || (r === 3 && c === 2)) out.hi += sq(r, c);
        else if (!F.has((r + 1) + ',' + c) || !F.has(r + ',' + (c + 1))) out.shade += sq(r, c);
        else out.fill += sq(r, c);
      } else if (F.has((r - 1) + ',' + c) || F.has((r + 1) + ',' + c) || F.has(r + ',' + (c - 1)) || F.has(r + ',' + (c + 1))) out.line += sq(r, c);
    }
    return (heartCache[px] = out);
  }
  const HEART_FULL = { fill: '#ff2d55', hi: '#ffffff', shade: '#b3123a' };
  const HEART_EMPTY = { fill: '#3b3355', hi: '#5c5480', shade: '#2a2440' };
  function pixelHeart(px, full) {
    const p = heartPaths(px), c = full ? HEART_FULL : HEART_EMPTY;
    const parts = {
      line: S('path', { d: p.line, fill: '#0b0716' }), fill: S('path', { d: p.fill, fill: c.fill }),
      shade: S('path', { d: p.shade, fill: c.shade }), hi: S('path', { d: p.hi, fill: c.hi }),
    };
    const g = S('g', { 'shape-rendering': 'crispEdges' }, parts.line, parts.fill, parts.shade, parts.hi);
    g.setFull = f => { const cc = f ? HEART_FULL : HEART_EMPTY; parts.fill.setAttribute('fill', cc.fill); parts.shade.setAttribute('fill', cc.shade); parts.hi.setAttribute('fill', cc.hi); };
    return g;
  }
  const heroIdx = v => (v <= 0 ? 0 : v >= 1 ? 5 : clamp(1 + Math.floor(v * 4), 1, 4));
  function vHero(host, quiet) {
    const id = 'lgh' + (++uid);
    const heroImgs = [0, 1, 2, 3, 4, 5].map(i => S('image', { href: `assets/img/hero-${i}.png`, x: 10, y: 6, width: 404, height: 404, class: 'lg-hero-img' }));
    const heroMissing = new Set();
    let curIdx = -1;
    const fbShow = () => { heroFb.style.display = heroMissing.has(curIdx) ? '' : 'none'; };
    heroImgs.forEach((im, i) => im.addEventListener('error', () => { im.style.display = 'none'; heroMissing.add(i); fbShow(); }));
    const heroFb = S('g', { class: 'lg-hero-fb' },
      S('rect', { x: 70, y: 70, width: 290, height: 300, rx: 20, fill: 'rgba(255,255,255,.06)', stroke: 'rgba(255,255,255,.35)', 'stroke-width': 4, 'stroke-dasharray': '14 10' }));
    const fbLabel = T(215, 230, 'hero-5.png', 'lg-t-pixel', { 'font-size': 16, fill: 'rgba(255,255,255,.5)', 'text-anchor': 'middle' });
    heroFb.append(fbLabel);
    const heroInner = origin(S('g', null, heroFb, ...heroImgs), 'center bottom');
    const fx = S('g');
    const hearts = S('g');
    const hpT = T(452, 404, '', 'lg-t-pixel', { 'font-size': 30, fill: '#fff6e3' });
    const statT = T(872, 404, '', 'lg-t-pixel', { 'font-size': 24, 'text-anchor': 'end' });
    const ko = T(212, 230, 'K.O.', 'lg-t-pixel lg-outline lg-blink', { 'font-size': 92, fill: '#ff2d55', 'text-anchor': 'middle', stroke: '#0b0716', 'stroke-width': 10 });
    const stars = S('g', { fill: '#fff', opacity: .5 });
    [[480, 40], [620, 26], [760, 52], [850, 30], [560, 300], [700, 330], [830, 290], [40, 40], [380, 60]].forEach(([x, y]) => stars.append(S('rect', { x, y, width: 6, height: 6 })));
    host.append(S('svg', { viewBox: '0 0 900 440', class: 'lg-viz' },
      S('defs', null, S('pattern', { id: id + 'f', width: 40, height: 40, patternUnits: 'userSpaceOnUse' },
        S('rect', { width: 40, height: 40, fill: '#3a2d7a' }), S('rect', { width: 20, height: 20, fill: '#33276c' }), S('rect', { x: 20, y: 20, width: 20, height: 20, fill: '#33276c' }))),
      S('rect', { x: 0, y: 0, width: 900, height: 440, rx: 26, fill: '#1b1440' }),
      stars,
      S('rect', { x: 0, y: 372, width: 900, height: 68, fill: `url(#${id}f)` }),
      S('rect', { x: 0, y: 368, width: 900, height: 8, fill: '#6a55c9' }),
      S('rect', { x: 3, y: 3, width: 894, height: 434, rx: 24, fill: 'none', stroke: INK, 'stroke-width': 6 }),
      T(452, 64, 'DAME HALF-A-LOT', 'lg-t-pixel', { 'font-size': 24, fill: '#ffc93c' }),
      T(452, 100, 'LV 9  KNIGHT', 'lg-t-pixel', { 'font-size': 14, fill: '#a99be0' }),
      S('ellipse', { cx: 212, cy: 392, rx: 120, ry: 14, fill: 'rgba(0,0,0,.35)' }),
      heroInner, ko, hearts, hpT, statT, fx));
    let hs = [], lastV = null;
    function popup(txt, color, x, y) {
      const t = T(x, y, txt, 'lg-t-pixel lg-outline', { 'font-size': 40, fill: color, stroke: '#0b0716', 'stroke-width': 8, 'text-anchor': 'middle' });
      origin(t); fx.append(t);
      t.animate([{ transform: 'translateY(20px) scale(.4)', opacity: 0 }, { transform: 'translateY(-10px) scale(1.25)', opacity: 1, offset: .2 }, { transform: 'translateY(-30px) scale(1)', opacity: 1, offset: .6 }, { transform: 'translateY(-110px) scale(1)', opacity: 0 }],
        { duration: 1300, easing: 'ease-out', fill: 'forwards' }).onfinish = () => t.remove();
    }
    function sparkles() {
      for (let i = 0; i < 14; i++) {
        const x = 60 + Math.random() * 310, y = 40 + Math.random() * 320, r = 8 + Math.random() * 12;
        const star = origin(S('path', { d: `M${x} ${y - r} L${x + r * .28} ${y - r * .28} L${x + r} ${y} L${x + r * .28} ${y + r * .28} L${x} ${y + r} L${x - r * .28} ${y + r * .28} L${x - r} ${y} L${x - r * .28} ${y - r * .28} Z`, fill: i % 3 ? '#fff6a8' : '#9be15d' }));
        fx.append(star);
        star.animate([{ transform: 'scale(0) rotate(0)', opacity: 1 }, { transform: 'scale(1.3) rotate(90deg)', opacity: 1, offset: .5 }, { transform: 'translateY(-40px) scale(0) rotate(180deg)', opacity: 0 }],
          { duration: 900, delay: i * 45, easing: 'ease-out', fill: 'backwards' }).onfinish = () => star.remove();
      }
    }
    return {
      update(n, d, prev) {
        const v = n / d;
        if (!prev || prev.d !== d || !hs.length) {
          hearts.textContent = ''; hs = [];
          const rows = Math.ceil(d / 6), per = Math.ceil(d / rows);
          const px = Math.floor(Math.min(10, 420 / per / 10, 240 / rows / 9.5));
          const top = 122 + (240 - rows * 9.5 * px) / 2;
          for (let i = 0; i < d; i++) {
            const h = pixelHeart(px, i < n);
            const wrap = origin(S('g', null, h));
            hearts.append(S('g', { transform: `translate(${452 + (i % per) * 10 * px} ${top + Math.floor(i / per) * 9.5 * px})` }, wrap));
            wrap.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.3)', offset: .6 }, { transform: 'scale(1)' }], { duration: 380, delay: i * 40, fill: 'backwards' });
            hs.push({ h, wrap, on: i < n });
          }
        }
        let k = 0;
        hs.forEach((s, i) => {
          const on = i < n;
          if (s.on !== on) {
            s.h.setFull(on);
            s.wrap.animate(on
              ? [{ transform: 'scale(.4)' }, { transform: 'scale(1.5)', offset: .5 }, { transform: 'scale(1)' }]
              : [{ transform: 'scale(1.4)', filter: 'brightness(3)' }, { transform: 'scale(.7) rotate(-12deg)', offset: .5 }, { transform: 'scale(1)' }],
            { duration: 420, delay: k * 50, easing: 'ease-out' });
            k++;
          }
          s.on = on;
        });
        // hero art crossfade
        const idx = heroIdx(v);
        if (idx !== curIdx) { heroImgs.forEach((im, i) => { im.style.opacity = i === idx ? 1 : 0; }); fbLabel.textContent = `hero-${idx}.png`; curIdx = idx; fbShow(); }
        ko.style.display = v === 0 ? '' : 'none';
        hpT.textContent = `HP ${n}/${d}`;
        statT.textContent = v === 1 ? 'FULL HP!' : v === 0 ? 'K.O.!' : v <= .25 ? 'DANGER!' : '';
        statT.setAttribute('fill', v === 1 ? '#9be15d' : '#ff4f5e');
        statT.classList.toggle('lg-blink', v > 0 && v <= .25);
        if (prev && lastV != null && v !== lastV) {
          const sameD = prev.d === d, diff = Math.abs(n - prev.n);
          if (v < lastV) {
            heroInner.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-26px) rotate(-4deg)', opacity: .3, offset: .15 }, { transform: 'translateX(22px) rotate(3deg)', opacity: 1, offset: .35 }, { transform: 'translateX(-14px)', opacity: .3, offset: .55 }, { transform: 'translateX(8px)', opacity: 1, offset: .75 }, { transform: 'none' }], { duration: 560 });
            popup(sameD ? `-${diff}` : 'OUCH', '#ff2d55', 300, 120);
            if (sameD) fx.lastChild && smallHeart(fx.lastChild);
            play('thud', quiet);
            if (v === 0) later(() => play('sad', quiet), 350);
          } else {
            sparkles();
            popup(sameD ? `+${diff}` : 'HEAL', '#9be15d', 300, 120);
            if (sameD) fx.lastChild && smallHeart(fx.lastChild);
            heroInner.animate([{ transform: 'none' }, { transform: 'translateY(-24px) scale(1.04)', offset: .4 }, { transform: 'none' }], { duration: 520, easing: 'ease-out' });
            play(v === 1 ? 'coin' : 'sparkle', quiet);
          }
        }
        lastV = v;
      },
    };
    // put a little pixel heart after "-1" / "+1" popup text (Press Start 2P has no ♥ glyph we can rely on)
    function smallHeart(textNode) {
      const h = pixelHeart(4, true), g = S('g', { transform: `translate(${+textNode.getAttribute('x') + 46} ${+textNode.getAttribute('y') - 34})` }, h);
      const wrap = S('g', null, g); fx.append(wrap);
      wrap.animate([{ transform: 'translateY(20px)', opacity: 0 }, { transform: 'translateY(-10px)', opacity: 1, offset: .2 }, { transform: 'translateY(-30px)', opacity: 1, offset: .6 }, { transform: 'translateY(-110px)', opacity: 0 }],
        { duration: 1300, easing: 'ease-out', fill: 'forwards' }).onfinish = () => wrap.remove();
    }
  }

  /* ---- 6. Boba: liquid assets ---- */
  function vBoba(host, quiet) {
    const id = 'lgt' + (++uid);
    const TOP = 128, BOT = 486, H = BOT - TOP;
    const cupD = 'M92 128 L348 128 L318 486 Q220 502 122 486 Z';
    const edgeX = y => 92 + (y - TOP) / H * 30;
    const wave = S('path', { d: 'M-440 0 q55 -18 110 0 t110 0 t110 0 t110 0 t110 0 t110 0 t110 0 t110 0 t110 0 t110 0 t110 0 t110 0 V600 H-440 Z', fill: '#c98b54' });
    wave.append(S('animateTransform', { attributeName: 'transform', type: 'translate', from: '0 0', to: '220 0', dur: '2.4s', repeatCount: 'indefinite' }));
    const wave2 = S('path', { d: 'M-440 6 q55 14 110 0 t110 0 t110 0 t110 0 t110 0 t110 0 t110 0 t110 0 t110 0 t110 0 t110 0 t110 0 V600 H-440 Z', fill: '#b5743f' });
    wave2.append(S('animateTransform', { attributeName: 'transform', type: 'translate', from: '0 0', to: '220 0', dur: '3.6s', repeatCount: 'indefinite' }));
    const liquid = S('g', { transform: `translate(0 ${BOT + 10})` }, wave2, wave);
    const pearls = S('g');
    [[140, 470], [172, 476], [204, 478], [236, 478], [268, 476], [298, 470], [156, 446], [188, 450], [220, 452], [252, 450], [284, 446], [172, 424], [206, 428], [240, 428], [272, 424]]
      .forEach(([x, y]) => pearls.append(S('circle', { cx: x, cy: y, r: 15, fill: '#2b170d' }), S('circle', { cx: x - 5, cy: y - 5, r: 4, fill: 'rgba(255,255,255,.45)' })));
    const ticks = S('g');
    const mouth = S('path', { fill: INK, stroke: INK, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    const tear = S('ellipse', { cx: 186, cy: 362, rx: 6, ry: 10, fill: '#5ab8ff', stroke: INK, 'stroke-width': 2 });
    const face = origin(S('g', null,
      S('ellipse', { cx: 168, cy: 352, rx: 15, ry: 8, fill: '#ff6fb5', opacity: .6 }), S('ellipse', { cx: 272, cy: 352, rx: 15, ry: 8, fill: '#ff6fb5', opacity: .6 }),
      S('circle', { cx: 186, cy: 332, r: 11, fill: INK }), S('circle', { cx: 254, cy: 332, r: 11, fill: INK }),
      S('circle', { cx: 190, cy: 328, r: 4, fill: '#fff' }), S('circle', { cx: 258, cy: 328, r: 4, fill: '#fff' }),
      mouth, tear));
    const s = S('svg', { viewBox: '0 0 440 520', class: 'lg-viz' },
      S('defs', null, S('clipPath', { id: id + 'c' }, S('path', { d: cupD }))),
      S('ellipse', { cx: 222, cy: 498, rx: 120, ry: 14, fill: 'rgba(29,18,51,.16)' }),
      S('line', { x1: 262, y1: 20, x2: 236, y2: 470, stroke: INK, 'stroke-width': 38, 'stroke-linecap': 'round' }),
      S('line', { x1: 262, y1: 20, x2: 236, y2: 470, stroke: '#ff6fb5', 'stroke-width': 26, 'stroke-linecap': 'round' }),
      S('path', { d: cupD, fill: 'rgba(220,235,255,.55)' }),
      S('g', { 'clip-path': `url(#${id}c)` }, liquid, pearls),
      ticks,
      S('path', { d: 'M112 150 L100 300', stroke: '#fff', 'stroke-width': 10, 'stroke-linecap': 'round', opacity: .7 }),
      S('path', { d: cupD, fill: 'none', stroke: INK, 'stroke-width': 7, 'stroke-linejoin': 'round' }),
      S('path', { d: 'M84 124 Q220 44 356 124 Z', fill: 'rgba(235,245,255,.75)', stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round' }),
      S('rect', { x: 76, y: 116, width: 288, height: 20, rx: 10, fill: '#fff', stroke: INK, 'stroke-width': 6 }),
      face);
    host.append(s);
    let level = 0, tok = 0;
    return {
      update(n, d, prev) {
        const v = n / d;
        if (!prev || prev.d !== d) {
          ticks.textContent = '';
          for (let i = 1; i < d; i++) {
            const y = BOT - i / d * H, x = edgeX(y);
            ticks.append(S('line', { x1: x + 6, x2: x + (d > 12 ? 26 : 38), y1: y, y2: y, stroke: INK, 'stroke-width': d > 12 ? 3 : 5, 'stroke-linecap': 'round' }));
          }
        }
        if (!prev) level = 0;
        const from = level, my = ++tok;
        tween(900, t => {
          if (my !== tok) return;
          level = from + (v - from) * t;
          liquid.setAttribute('transform', `translate(0 ${BOT + 10 - level * (H + 10)})`);
          pearls.style.opacity = Math.min(1, level * 6);
        }, t => 1 - Math.pow(1 - t, 3) + Math.sin(t * Math.PI) * .08);
        mouth.setAttribute('d', v === 0 ? 'M200 384 Q220 368 240 384' : v === 1 ? 'M196 368 Q220 408 244 368 Z' : 'M200 370 Q220 390 240 370');
        mouth.setAttribute('fill', v === 1 ? INK : 'none');
        tear.style.display = v === 0 ? '' : 'none';
        face.animate([{ transform: 'none' }, { transform: 'scale(1.15, .9)', offset: .4 }, { transform: 'none' }], { duration: 400 });
        if (prev) play(v > from ? 'slide' : 'boing', quiet);
      },
    };
  }

  /* ---- 7. Phone battery ---- */
  function vBattery(host, quiet) {
    const AX = 60, AY = 82, AW = 460, AH = 156;
    const segs = S('g');
    const pctT = T(290, 186, '', 'lg-t-display lg-outline', { 'font-size': 64, fill: '#fff', stroke: INK, 'stroke-width': 12, 'text-anchor': 'middle' });
    const statT = T(320, 318, '', 'lg-t-display', { 'font-size': 32, 'text-anchor': 'middle' });
    const bolt = origin(S('path', { d: 'M318 20 L270 104 H306 L286 170 L350 74 H312 L336 20 Z', fill: '#ffc93c', stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round' }));
    host.append(S('svg', { viewBox: '0 0 640 340', class: 'lg-viz' },
      S('rect', { x: 40, y: 70, width: 520, height: 200, rx: 38, fill: 'rgba(29,18,51,.16)', transform: 'translate(8 10)' }),
      S('rect', { x: 562, y: 126, width: 44, height: 88, rx: 14, fill: INK }),
      S('rect', { x: 36, y: 58, width: 508, height: 204, rx: 38, fill: '#2a2340', stroke: INK, 'stroke-width': 14 }),
      segs, pctT, bolt, statT));
    let ss = [], tok = 0;
    return {
      update(n, d, prev) {
        const v = n / d;
        const color = v <= .2 ? '#ff4f5e' : v <= .5 ? '#ffc93c' : '#3ddc84';
        const rebuild = !prev || prev.d !== d || !ss.length;
        if (rebuild) {
          segs.textContent = ''; ss = [];
          const gap = d > 12 ? 5 : 8, w = (AW - gap * (d - 1)) / d;
          for (let i = 0; i < d; i++) {
            const r = S('rect', { x: AX + i * (w + gap), y: AY, width: w, height: AH, rx: Math.min(10, w / 3) });
            origin(r, 'center bottom'); segs.append(r); ss.push({ r, on: null });
          }
        }
        const my = ++tok; let k = 0;
        ss.forEach((s, i) => {
          const on = i < n;
          s.r.setAttribute('fill', on ? color : '#3d3460');
          if (s.on !== on || rebuild) {
            if (on) {
              s.r.animate([{ transform: 'scaleY(0)', opacity: .2 }, { transform: 'scaleY(1.08)', opacity: 1, offset: .7 }, { transform: 'none' }], { duration: 300, delay: k * 55, fill: 'backwards' });
              if (k < 12) later(() => my === tok && play('blip', quiet), k * 55);
              k++;
            }
          }
          s.on = on;
        });
        pctT.textContent = pctNum(n, d).txt;
        pctT.classList.toggle('lg-blink', v > 0 && v <= .2);
        const charging = prev && v > prev.n / prev.d;
        bolt.style.display = charging || v === 1 ? '' : 'none';
        if (charging) bolt.animate([{ transform: 'scale(0) rotate(-30deg)' }, { transform: 'scale(1.3)', offset: .6 }, { transform: 'none' }], { duration: 420, easing: 'ease-out' });
        statT.textContent = v === 1 ? 'FULLY CHARGED' : v === 0 ? 'DEAD. PLEASE CHARGE.' : v <= .2 ? 'LOW BATTERY!' : charging ? 'CHARGING...' : `${n} of ${d} bars`;
        statT.setAttribute('fill', v === 1 ? '#1f9d55' : v <= .2 ? '#e0283a' : INK);
      },
    };
  }

  /* ---------------- registry ---------------- */
  const ICON = {
    bar: `<rect x="4" y="17" width="40" height="15" rx="5" fill="#fff" stroke="${INK}" stroke-width="3"/><rect x="4" y="17" width="25" height="15" rx="5" fill="#36d27a" stroke="${INK}" stroke-width="3"/>`,
    pie: `<circle cx="24" cy="24" r="19" fill="#fff" stroke="${INK}" stroke-width="3"/><path d="M24 24 V5 A19 19 0 0 1 42 30 Z" fill="#ff6fb5" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
    choc: `<rect x="5" y="10" width="38" height="28" rx="3" fill="#8a4a22" stroke="${INK}" stroke-width="3"/><path d="M17.7 10v28M30.3 10v28M5 24h38" stroke="${INK}" stroke-width="2.5"/>`,
    cats: `<path d="M10 22 L12 6 L22 15 Z M38 22 L36 6 L26 15 Z" fill="#ff9a3c" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><ellipse cx="24" cy="27" rx="16" ry="14" fill="#ff9a3c" stroke="${INK}" stroke-width="3"/><circle cx="18" cy="25" r="2.5" fill="${INK}"/><circle cx="30" cy="25" r="2.5" fill="${INK}"/>`,
    hero: `<path d="M8 10h12v4h-12zM28 10h12v4h-12zM4 14h40v12h-40zM8 26h32v4h-32zM12 30h24v4h-24zM16 34h16v4h-16zM20 38h8v4h-8z" fill="#ff2d55" stroke="${INK}" stroke-width="2.5" shape-rendering="crispEdges"/>`,
    boba: `<path d="M12 14 H36 L33 42 Q24 45 15 42 Z" fill="#c98b54" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M27 2 L25 30" stroke="#ff6fb5" stroke-width="5" stroke-linecap="round"/><circle cx="20" cy="37" r="3" fill="${INK}"/><circle cx="28" cy="37" r="3" fill="${INK}"/>`,
    battery: `<rect x="3" y="13" width="36" height="22" rx="5" fill="#2a2340" stroke="${INK}" stroke-width="3"/><rect x="40" y="19" width="5" height="10" rx="2" fill="${INK}"/><rect x="7" y="17" width="8" height="14" rx="2" fill="#3ddc84"/><rect x="17" y="17" width="8" height="14" rx="2" fill="#3ddc84"/>`,
    all: `<rect x="5" y="5" width="17" height="17" rx="4" fill="#ffc93c" stroke="${INK}" stroke-width="3"/><rect x="26" y="5" width="17" height="17" rx="4" fill="#ff6fb5" stroke="${INK}" stroke-width="3"/><rect x="5" y="26" width="17" height="17" rx="4" fill="#22d3c5" stroke="${INK}" stroke-width="3"/><rect x="26" y="26" width="17" height="17" rx="4" fill="#9be15d" stroke="${INK}" stroke-width="3"/>`,
  };
  const VIZ = [
    { key: 'bar', label: 'LOADING', exhibit: 'Exhibit A: The Loading Bar', make: vBar },
    { key: 'pie', label: 'PIE', exhibit: 'Exhibit B: The Circle of Fiscal Responsibility', make: vPie },
    { key: 'choc', label: 'CHOCOLATE', exhibit: 'Exhibit C: The Divided Rectangle', make: vChoc },
    { key: 'cats', label: 'CATS', exhibit: 'Exhibit D: Cats, Sorted by Color', make: vCats },
    { key: 'hero', label: 'HERO', exhibit: 'Exhibit E: Hero Health Points', make: vHero },
    { key: 'boba', label: 'BOBA', exhibit: 'Exhibit F: Liquid Assets', make: vBoba },
    { key: 'battery', label: 'BATTERY', exhibit: 'Exhibit G: Telephone Battery', make: vBattery },
  ];
  const ALL = { key: 'all', label: 'SHOW ALL', exhibit: 'All Exhibits: Same Number, Seven Ways' };

  /* ---------------- easel / sheets ---------------- */
  function buildSheet(key) {
    const def = key === 'all' ? ALL : VIZ.find(v => v.key === key);
    const body = el('div', { class: 'lg-sheet-body' + (key === 'all' ? ' lg-all' : '') + ' lg-v-' + key });
    const sheet = el('div', { class: 'lg-sheet' },
      el('div', { class: 'lg-sheet-head' },
        el('div', { class: 'lg-report', text: 'QUARTERLY FRACTION REPORT' }),
        el('div', { class: 'lg-exhibit', text: def.exhibit })),
      body);
    mainInst = null; gridInsts = []; gridFrac = null;
    if (key === 'all') {
      VIZ.forEach((v, i) => {
        const host = el('div', { class: 'lg-cell-viz' });
        const cell = el('div', { class: 'lg-cell', style: { animationDelay: (i * 70) + 'ms' } }, host, el('div', { class: 'lg-cell-label', text: v.label }));
        body.append(cell);
        gridInsts.push(v.make(host, true));
      });
      gridFrac = el('div', { class: 'lg-cell lg-cell-frac', style: { animationDelay: '490ms' } });
      body.append(gridFrac);
    } else {
      mainInst = def.make(body, false);
    }
    return sheet;
  }

  function renderFracCell() {
    if (!gridFrac) return;
    gridFrac.innerHTML = '';
    gridFrac.append(el('div', { class: 'big-frac lg-cell-big' }, el('span', { text: st.n }), el('span', { text: st.d })),
      el('div', { class: 'lg-cell-pct', text: pctStr(st.n, st.d) }));
  }

  function renderViz(prev) {
    if (mainInst) mainInst.update(st.n, st.d, prev);
    gridInsts.forEach(g => g.update(st.n, st.d, prev));
    if (gridFrac) { renderFracCell(); if (prev) bump(gridFrac, 'lg-bounce'); }
    if (prev && gridInsts.length) Sound.sfx(st.n / st.d > prev.n / prev.d ? 'pop' : 'boing');
  }

  function showView(key, flip = true) {
    st.view = key;
    ui.tabs.forEach(t => t.classList.toggle('on', t.dataset.key === key));
    const old = ui.sheet;
    const sheet = buildSheet(key);
    ui.sheet = sheet;
    if (old && flip) {
      ui.paper.insertBefore(sheet, old);
      old.classList.add('lg-flip');
      old.addEventListener('animationend', () => old.remove(), { once: true });
      later(() => old.remove(), 1200);
      sheet.classList.add('lg-under');
      Sound.sfx('slide'); later(() => Sound.sfx('whoosh'), 80);
    } else {
      if (old) old.remove();
      ui.paper.append(sheet);
    }
    renderViz(null);
    renderFracCell();
  }

  /* ---------------- Ledger ---------------- */
  function setPose(pose) {
    if (pose === poseNow) return;
    poseNow = pose;
    Object.entries(ui.poses).forEach(([k, img]) => img.classList.toggle('on', k === pose));
    bump(ui.ledgerSquash, 'lg-squash');
  }

  function say(key, pose) {
    const text = LINES[key];
    if (!text) return;
    lastKey = key;
    if (pose) setPose(pose);
    voiceOK = false;
    const a = Sound.voice(key);
    if (a) a.addEventListener('playing', () => { voiceOK = true; }, { once: true });
    ui.typed.textContent = ''; ui.rest.textContent = text;
    ui.bubble.classList.remove('lg-hide');
    bump(ui.bubble, 'pop');
    bump(ui.ledgerSquash, 'lg-nod');
    clearInterval(typeTimer);
    let i = 0;
    typeTimer = setInterval(() => {
      i++;
      ui.typed.textContent = text.slice(0, i); ui.rest.textContent = text.slice(i);
      if (!voiceOK && i % 3 === 0 && text[i - 1] !== ' ') Sound.sfx('tick');
      if (i >= text.length) { clearInterval(typeTimer); typeTimer = null; }
    }, 30);
  }

  function pickLine(cat) {
    const list = CATS[cat];
    const opts = list.filter(k => k !== lastKey);
    return (opts.length ? opts : list)[Math.floor(Math.random() * (opts.length || list.length))];
  }

  function classify(n, d) {
    if (n === 0) return 'zero';
    if (n === d) return 'whole';
    if (2 * n === d) return 'half';
    const v = n / d;
    if (v < .25) return 'tiny';
    if (v < .5) return 'low';
    if (v >= .85) return 'nearly';
    return 'high';
  }

  function comment() {
    let cat = classify(st.n, st.d);
    if (!['zero', 'whole', 'half'].includes(cat) && gcd(st.n, st.d) > 1 && lastCat !== 'simplify' && Math.random() < .6) cat = 'simplify';
    if (cat === lastCat && cat !== 'zero' && cat !== 'whole') { setPose(CAT_POSE[cat]); return; }
    lastCat = cat;
    say(pickLine(cat), CAT_POSE[cat]);
  }

  function scold(key, input) {
    Sound.sfx('buzz');
    if (input) bump(input, 'lg-nope');
    clearTimeout(commentTimer);
    const now = performance.now();
    if (lastScold.key === key && now - lastScold.t < 3000) return false;
    lastScold = { key, t: now };
    lastCat = null;
    say('ledger/' + key, key === 'divzero' ? 'horrified' : 'unimpressed');
    return false;
  }

  /* ---------------- fraction state ---------------- */
  function syncInputs() {
    if (document.activeElement !== ui.nIn) ui.nIn.value = st.n;
    if (document.activeElement !== ui.dIn) ui.dIn.value = st.d;
    ui.pct.textContent = pctStr(st.n, st.d);
    ui.root.classList.toggle('lg-is-zero', st.n === 0);
    ui.root.classList.toggle('lg-is-whole', st.n === st.d);
  }

  function setStamp() {
    const s = st.n === st.d ? ['APPROVED', 'ok'] : st.n === 0 ? ['REJECTED', 'bad'] : ['CONFIDENTIAL', ''];
    if (ui.stamp.textContent === s[0]) return;
    ui.stamp.textContent = s[0];
    ui.stamp.className = 'lg-stamp ' + s[1];
    bump(ui.stamp, 'lg-slam');
    if (s[1]) later(() => Sound.sfx('thud'), 180);
  }

  function setFrac(n, d) {
    const prev = { n: st.n, d: st.d };
    st.n = n; st.d = d;
    syncInputs();
    if (prev.n === n && prev.d === d) return;
    renderViz(prev);
    setStamp();
    const v = n / d;
    if (n === 0) setPose('horrified');
    else if (n === d) setPose('delighted');
    else if (poseNow === 'horrified' || poseNow === 'delighted') setPose(v < .5 ? 'unimpressed' : 'lecture');
    if (n === d && prev.n !== prev.d) { Deck.confetti(root, 90); later(() => Sound.sfx('fanfare'), 250); }
    clearTimeout(commentTimer);
    commentTimer = later(comment, 700);
  }

  function stepN(delta) {
    const n = st.n + delta;
    if (n < 0) return scold('negative', ui.nIn);
    if (n > st.d) return scold('improper', ui.nIn);
    setFrac(n, st.d);
    bump(ui.nIn, 'lg-bounce');
    Sound.sfx(delta > 0 ? 'blip' : 'tick');
    return true;
  }
  function stepD(delta) {
    const d = st.d + delta;
    if (d < 1) return scold('divzero', ui.dIn);
    if (d > MAXD) return scold('toobig', ui.dIn);
    const n = Math.min(st.n, d);
    if (n !== st.n) bump(ui.nIn, 'lg-bounce');
    setFrac(n, d);
    bump(ui.dIn, 'lg-bounce');
    Sound.sfx(delta > 0 ? 'blip' : 'tick');
    return true;
  }

  function commitInputs() {
    clearTimeout(inputTimer);
    const rn = parseInt(ui.nIn.value, 10), rd = parseInt(ui.dIn.value, 10);
    let n = isNaN(rn) ? st.n : rn, d = isNaN(rd) ? st.d : rd;
    let sc = null, inp = null;
    if (d < 1) { sc = 'divzero'; inp = ui.dIn; d = st.d; }
    else if (d > MAXD) { sc = 'toobig'; inp = ui.dIn; d = MAXD; }
    if (n > d) { if (!sc) { sc = 'improper'; inp = ui.nIn; } n = d; }
    const changed = n !== st.n || d !== st.d;
    if (changed) { setFrac(n, d); Sound.sfx('coin'); }
    ui.nIn.value = st.n; ui.dIn.value = st.d;
    if (sc) { scold(sc, inp); }
  }

  function stepper(cls, label, sym, fn) {
    const b = el('button', { class: 'lg-step ' + cls, 'aria-label': label }, sym);
    let hold = null, rep = null;
    const stop = () => { clearTimeout(hold); clearInterval(rep); hold = rep = null; };
    b.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (fn() === false) return;
      hold = setTimeout(() => { rep = setInterval(() => { if (fn() === false) stop(); }, 130); }, 450);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
    b.addEventListener('click', e => { if (e.detail === 0) fn(); b.blur(); });
    stoppers.push(stop);
    return b;
  }

  function numInput(label) {
    const inp = el('input', { class: 'lg-in', type: 'text', inputmode: 'numeric', maxlength: 2, 'aria-label': label, autocomplete: 'off' });
    inp.addEventListener('focus', () => setTimeout(() => inp.select(), 0));
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g, '').slice(0, 2);
      clearTimeout(inputTimer);
      if (inp.value !== '') inputTimer = setTimeout(commitInputs, 1100);
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { commitInputs(); inp.blur(); }
      else if (e.key === 'Escape') { inp.value = inp === ui.nIn ? st.n : st.d; inp.blur(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault(); commitInputs();
        (inp === ui.nIn ? stepN : stepD)(e.key === 'ArrowUp' ? 1 : -1);
        inp.value = inp === ui.nIn ? st.n : st.d; inp.select();
      }
    });
    inp.addEventListener('blur', () => commitInputs());
    return inp;
  }

  function shuffle() {
    const tok = ++shufTok;
    Sound.sfx('drum');
    const d = 2 + Math.floor(Math.random() * 11);
    let n = Math.floor(Math.random() * (d + 1));
    if (n === st.n && d === st.d) n = (n + 1) % (d + 1);
    ui.panel.classList.add('lg-rolling');
    for (let i = 0; i < 12; i++) later(() => {
      if (tok !== shufTok) return;
      const dd = 1 + Math.floor(Math.random() * 12);
      ui.nIn.value = Math.floor(Math.random() * (dd + 1)); ui.dIn.value = dd;
    }, i * 75);
    later(() => {
      if (tok !== shufTok) return;
      ui.panel.classList.remove('lg-rolling');
      setFrac(n, d);
      bump(ui.nIn, 'lg-bounce'); bump(ui.dIn, 'lg-bounce');
      Sound.sfx('ding');
    }, 12 * 75 + 40);
  }

  /* ---------------- build ---------------- */
  function easelSvg() {
    const wood = '#8a5428', dark = '#4a2a10', line = '#3b200c';
    return S('svg', { class: 'lg-easel-legs', viewBox: '0 0 1040 920' },
      S('rect', { x: 505, y: 0, width: 30, height: 900, rx: 6, fill: '#5b3518', stroke: line, 'stroke-width': 4 }),
      S('rect', { x: 150, y: 820, width: 740, height: 24, rx: 8, fill: dark, stroke: line, 'stroke-width': 4 }),
      S('path', { d: 'M446 0 H486 L132 916 H82 Z', fill: wood, stroke: line, 'stroke-width': 5, 'stroke-linejoin': 'round' }),
      S('path', { d: 'M594 0 H554 L908 916 H958 Z', fill: wood, stroke: line, 'stroke-width': 5, 'stroke-linejoin': 'round' }),
      S('path', { d: 'M462 10 L112 900 M578 10 L928 900', stroke: '#a8703c', 'stroke-width': 4, opacity: .6 }),
      S('rect', { x: 440, y: 0, width: 160, height: 34, rx: 10, fill: wood, stroke: line, 'stroke-width': 5 }),
      S('circle', { cx: 520, cy: 17, r: 9, fill: '#e6b74a', stroke: line, 'stroke-width': 3 }));
  }

  function build(r) {
    root = r;
    ui.root = r;
    r.append(art('bg-office.png', 'bg'));
    r.append(el('div', { class: 'lg-vignette' }));

    // Ledger
    ui.poses = {};
    const poseWrap = el('div', { class: 'lg-ledger-squash' });
    ['lecture', 'unimpressed', 'horrified', 'delighted'].forEach(p => {
      const img = art(`ledger-${p}.png`, 'lg-pose' + (p === poseNow ? ' on' : ''), 'Mr. Ledger');
      ui.poses[p] = img; poseWrap.append(img);
    });
    ui.ledgerSquash = poseWrap;
    r.append(el('div', { class: 'lg-ledger' }, el('div', { class: 'lg-ledger-bob' }, poseWrap)));
    r.append(el('div', { class: 'lg-plate' },
      el('div', { class: 'lg-plate-name', text: 'Pennington P. Ledger III' }),
      el('div', { class: 'lg-plate-sub', text: 'Certified Public Accountant' })));

    // speech bubble
    ui.typed = el('span', { class: 'lg-typed' });
    ui.rest = el('span', { class: 'lg-rest' });
    ui.bubble = el('div', { class: 'bubble tail-down lg-bubble lg-hide' }, ui.typed, ui.rest);
    r.append(ui.bubble);

    // easel + board
    ui.paper = el('div', { class: 'lg-paper' });
    ui.stamp = el('div', { class: 'lg-stamp', text: 'CONFIDENTIAL' });
    const rings = el('div', { class: 'lg-rings' }, ...[0, 1, 2, 3, 4, 5].map(() => el('i')));
    r.append(el('div', { class: 'lg-easel' },
      easelSvg(),
      el('div', { class: 'lg-board' }, ui.paper, rings, ui.stamp),
      el('div', { class: 'lg-tray' }, el('i', { class: 'm1' }), el('i', { class: 'm2' }), el('i', { class: 'm3' }))));

    // tabs
    ui.tabs = [...VIZ, ALL].map(v => {
      const b = el('button', { class: 'lg-tab' + (v.key === 'all' ? ' lg-tab-all' : ''), 'data-key': v.key, 'aria-label': v.label },
        el('div', { class: 'lg-medal', html: `<svg viewBox="0 0 48 48">${ICON[v.key]}</svg>` }),
        el('div', { class: 'lg-tab-label', text: v.label }));
      b.addEventListener('click', () => {
        b.blur();
        bump(b, 'lg-tab-hit');
        if (st.view === v.key) { Sound.sfx('boing'); return; }
        showView(v.key, true);
        clearTimeout(commentTimer);
        say('ledger/tab_' + v.key, 'lecture');
        lastCat = null;
      });
      return b;
    });
    r.append(el('div', { class: 'lg-tabs' }, ...ui.tabs));

    // fraction controls
    ui.nIn = numInput('Numerator');
    ui.dIn = numInput('Denominator');
    ui.pct = el('div', { class: 'lg-pct' });
    const shuf = el('button', { class: 'btn small violet lg-shuffle', onclick: () => { shuf.blur(); shuffle(); } }, 'SHUFFLE');
    ui.panel = el('div', { class: 'lg-panel' },
      el('div', { class: 'lg-panel-h', text: 'YOUR FRACTION' }),
      el('div', { class: 'lg-cap', text: 'pieces colored' }),
      el('div', { class: 'lg-row' }, stepper('minus', 'Fewer colored pieces', '−', () => stepN(-1)), ui.nIn, stepper('plus', 'More colored pieces', '+', () => stepN(1))),
      el('div', { class: 'lg-fbar' }),
      el('div', { class: 'lg-row' }, stepper('minus', 'Fewer pieces', '−', () => stepD(-1)), ui.dIn, stepper('plus', 'More pieces', '+', () => stepD(1))),
      el('div', { class: 'lg-cap', text: 'pieces in all' }),
      ui.pct, shuf);
    r.append(ui.panel);

    // know when the real art is on disk, so the drawn stand-ins can step aside
    [['cat-orange.png', 'lg-has-cat-orange'], ['cat-green.png', 'lg-has-cat-green']].forEach(([f, cls]) => {
      const im = new Image(); im.onload = () => r.classList.add(cls); im.src = 'assets/img/' + f;
    });

    syncInputs();
    setStamp();
    showView(st.view, false);
  }

  Deck.add({
    id: 'ledger',
    title: 'Fractions at Work',
    theme: 'lg',
    build,
    enter() {
      active = true;
      lastCat = classify(st.n, st.d);
      showView(st.view, false);
      later(() => say('ledger/intro', 'lecture'), 450);
    },
    leave() {
      active = false;
      shufTok++;
      timers.forEach(clearTimeout); timers.clear();
      clearInterval(typeTimer); typeTimer = null;
      clearTimeout(commentTimer); clearTimeout(inputTimer);
      stoppers.forEach(s => s());
      ui.panel && ui.panel.classList.remove('lg-rolling');
      syncInputs();
      Sound.stopVoice();
    },
  });

  // exposed for screenshots/tests: LedgerSlide.set(7, 12); LedgerSlide.view('hero')
  window.LedgerSlide = {
    set: (n, d) => setFrac(n, d),
    view: k => ui.tabs.find(t => t.dataset.key === k).click(),
    lines: LINES,
  };
})();
