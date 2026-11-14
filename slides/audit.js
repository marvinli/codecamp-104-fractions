/* Slide: "Ledger's Audit". Mr. Ledger hands the class five fraction-operation cases (Brearley Class IV level:
 * comparing, equivalence, improper fractions, adding/subtracting, whole number × fraction).
 * Step 0: the case file cover. Then each case is two builds: the question (kids work it out), then Next
 * reveals an animated proof and the answer, stamped APPROVED.
 */
(function () {
  const { el, svg: S, art, bump } = Deck;
  const INK = '#1d1233';
  const LINES = {
    'ledger/au-intro': "Drawing fractions is child's play. Now, the audit. Five cases. Show your work.",
    'ledger/au-q1': 'Case one. Which is larger: five eighths, or two thirds? Think carefully. I am watching.',
    'ledger/au-a1': 'Two thirds. Larger by one twenty-fourth. A tiny margin, but money is money.',
    'ledger/au-q2': 'Case two. Someone claims six eighths equals three quarters. Prove it. I am very hard to convince.',
    'ledger/au-a2': 'Each quarter is two eighths. Double the top, double the bottom. Approved.',
    'ledger/au-q3': 'Case three. The knight claims seven quarters of a heart. That is more than one heart! Explain.',
    'ledger/au-a3': 'One whole heart, and three quarters of another. Most irregular, but correct.',
    'ledger/au-q4': 'Case four. Someone ate one quarter of my pie. Then three eighths more. How much is left?',
    'ledger/au-a4': 'Five eighths eaten. Three eighths left. I shall be filing a complaint.',
    'ledger/au-q5': 'Case five. I drink two fifths of a boba every day. How much do I drink in three days?',
    'ledger/au-a5': 'Six fifths. One whole boba, and one fifth more. I regret nothing.',
  };
  const F = (n, d, cls = '') => `<span class="big-frac au-f ${cls}"><span>${n}</span><span>${d}</span></span>`;

  let root, ui = {}, shown = -1, typeTimer = null, uid = 0;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };
  const on = (node, yes = true) => node && node.classList.toggle('on', yes);

  /* ---------------- Ledger + bubble (same look as the Ledger slide) ---------------- */
  function setPose(p) {
    Object.entries(ui.poses).forEach(([k, img]) => img.classList.toggle('on', k === p));
    bump(ui.squash, 'lg-squash');
  }
  function say(key, pose, voice = true) {
    const text = LINES[key];
    if (pose) setPose(pose);
    if (voice) Sound.voice(key);
    ui.typed.textContent = ''; ui.rest.textContent = text;
    ui.bubble.classList.remove('lg-hide');
    bump(ui.bubble, 'pop');
    clearInterval(typeTimer);
    let i = 0;
    typeTimer = setInterval(() => {
      i++;
      ui.typed.textContent = text.slice(0, i); ui.rest.textContent = text.slice(i);
      if (i >= text.length) { clearInterval(typeTimer); typeTimer = null; }
    }, voice ? 30 : 1);
  }

  /* ---------------- drawing helpers (SVG, 1180 × 420) ---------------- */
  function sFrac(x, y, n, d, size = 54, fill = INK) {
    return S('g', { class: 'au-sfrac', 'font-size': size, fill },
      S('text', { x, y: y - size * 0.12, 'text-anchor': 'middle' }, n + ''),
      S('rect', { x: x - size * 0.42, y: y - size * 0.02, width: size * 0.84, height: size * 0.09, rx: size * 0.04 }),
      S('text', { x, y: y + size * 0.84, 'text-anchor': 'middle' }, d + ''));
  }
  const txt = (x, y, s, cls = '', anchor = 'middle') => { const t = S('text', { x, y, class: cls, 'text-anchor': anchor }); t.textContent = s; return t; };

  /* A fraction bar: `parts` equal pieces, the first `v` of the length filled when revealed. */
  function bar(g, y, parts, v, color, BX = 230, BW = 820, BH = 100) {
    g.append(S('rect', { x: BX, y, width: BW, height: BH, rx: 12, fill: '#fffaf0', stroke: INK, 'stroke-width': 5 }));
    const fill = S('rect', { x: BX, y, width: BW, height: BH, rx: 12, fill: color, class: 'au-fill', style: `--v:${v}` });
    g.append(fill);
    for (let i = 1; i < parts; i++) g.append(S('line', { x1: BX + BW * i / parts, y1: y, x2: BX + BW * i / parts, y2: y + BH, stroke: INK, 'stroke-width': 4 }));
    g.append(S('rect', { x: BX, y, width: BW, height: BH, rx: 12, fill: 'none', stroke: INK, 'stroke-width': 6 }));
    return fill;
  }
  function ticks(g, y, parts, color, BX = 230, BW = 820, BH = 100, dash = '') {
    const t = S('g', { class: 'au-x' });
    for (let i = 1; i < parts; i++) t.append(S('line', { x1: BX + BW * i / parts, y1: y + 6, x2: BX + BW * i / parts, y2: y + BH - 6, stroke: color, 'stroke-width': 3, 'stroke-dasharray': dash }));
    g.append(t);
    return t;
  }
  function vline(g, x, y1, y2, color = '#c4202f') {
    const l = S('line', { x1: x, y1, x2: x, y2, stroke: color, 'stroke-width': 6, 'stroke-dasharray': '14 10', class: 'au-x' });
    g.append(l);
    return l;
  }

  /* ---------------- the five cases ----------------
     draw(svg, host) builds the question state and returns reveal(animate) which shows the proof. */
  const CASES = [
    {
      name: 'The Larger Fraction',
      q: `Which is larger: ${F(5, 8)} or ${F(2, 3)}?`,
      a: `<b>${F(2, 3)} is larger.</b> ${F(5, 8)} = ${F(15, 24)} and ${F(2, 3)} = ${F(16, 24)}, so it wins by ${F(1, 24)}.`,
      draw(g) {
        g.append(sFrac(110, 115, 5, 8), sFrac(110, 295, 2, 3));
        const f1 = bar(g, 50, 8, 5 / 8, '#ffc93c'), f2 = bar(g, 230, 3, 2 / 3, '#22d3c5');
        const t1 = ticks(g, 50, 24, 'rgba(29,18,51,.35)'), t2 = ticks(g, 230, 24, 'rgba(29,18,51,.35)');
        const x58 = 230 + 820 * 5 / 8, x23 = 230 + 820 * 2 / 3;
        const sliver = S('rect', { x: x58, y: 230, width: x23 - x58, height: 100, fill: '#ff4f9a', class: 'au-x au-pulse' });
        g.append(sliver);
        const line = vline(g, x58, 30, 350);
        const l1 = S('g', { class: 'au-x' }, txt(1110, 112, '=', 'au-eq'), sFrac(1150, 115, 15, 24, 38));
        const l2 = S('g', { class: 'au-x' }, txt(1110, 292, '=', 'au-eq'), sFrac(1150, 295, 16, 24, 38));
        const lab = S('g', { class: 'au-x' }, txt(x58 + (x23 - x58) / 2, 395, 'the difference: 1/24', 'au-note'));
        g.append(l1, l2, lab);
        return anim => seq(anim, [[0, () => on(f1)], [600, () => on(f2)], [1500, () => { on(t1); on(t2); }],
          [2100, () => { on(l1); on(l2); }], [2800, () => { on(line); on(sliver); on(lab); }]]);
      },
    },
    {
      name: 'The Suspicious Equivalence',
      q: `Prove that ${F(6, 8)} is the same as ${F(3, 4)}.`,
      a: `${F(3, 4)} = ${F('3 × 2', '4 × 2')} = ${F(6, 8)}. Each quarter is <b>2 eighths</b>.`,
      draw(g) {
        g.append(sFrac(110, 115, 6, 8), sFrac(110, 295, 3, 4));
        const f1 = bar(g, 50, 8, 6 / 8, '#ffc93c'), f2 = bar(g, 230, 4, 3 / 4, '#22d3c5');
        const split = ticks(g, 230, 8, '#ff4f9a', 230, 820, 100, '10 7');
        const line = vline(g, 230 + 820 * 3 / 4, 30, 350, '#1aa34a');
        const lab = S('g', { class: 'au-x' }, txt(230 + 820 * 3 / 4, 385, 'same length!', 'au-note good'));
        g.append(lab);
        return anim => seq(anim, [[0, () => on(f1)], [700, () => on(f2)], [1600, () => on(split)], [2500, () => { on(line); on(lab); }]]);
      },
    },
    {
      name: 'The Overfull Hearts',
      q: `The knight says she has ${F(7, 4)} hearts. How many hearts is that?`,
      a: `${F(7, 4)} = ${F(4, 4)} + ${F(3, 4)} = <b>1 whole heart and ${F(3, 4)}</b>, which is 1${F(3, 4)}.`,
      draw(g, host) {
        const HEART = 'M150 268 C 62 200 4 142 4 82 C 4 32 42 4 86 4 C 116 4 140 22 150 44 C 160 22 184 4 214 4 C 258 4 296 32 296 82 C 296 142 238 200 150 268 Z';
        const pieces = [];
        [[230, 40], [640, 40]].forEach(([x, y], h) => {
          const id = 'auh' + (++uid);
          const hg = S('g', { transform: `translate(${x} ${y})` });
          hg.append(S('clipPath', { id }, S('path', { d: HEART })));
          hg.append(S('path', { d: HEART, fill: '#efe4cc' }));
          const q = S('g', { 'clip-path': `url(#${id})` });
          [[0, 0], [150, 0], [0, 136], [150, 136]].forEach(([qx, qy]) => {
            const r = S('rect', { x: qx, y: qy, width: 150, height: 136, fill: '#ff2d55', class: 'au-piece' });
            q.append(r); pieces.push(r);
          });
          q.append(S('line', { x1: 150, y1: 0, x2: 150, y2: 272, stroke: INK, 'stroke-width': 4 }), S('line', { x1: 0, y1: 136, x2: 300, y2: 136, stroke: INK, 'stroke-width': 4 }));
          hg.append(q, S('path', { d: HEART, fill: 'none', stroke: INK, 'stroke-width': 7, 'stroke-linejoin': 'round' }));
          g.append(hg);
        });
        const lab1 = S('g', { class: 'au-x' }, txt(380, 360, '4 quarters = 1 whole', 'au-note good'));
        const lab2 = S('g', { class: 'au-x' }, txt(790, 360, '3 quarters', 'au-note'));
        const count = txt(120, 190, '0', 'au-count');
        g.append(lab1, lab2, txt(120, 120, 'pieces', 'au-small'), count, txt(120, 240, 'of 7', 'au-small'));
        host.append(art('hero-3.png', 'au-hero', 'the knight'));
        return anim => seq(anim, pieces.slice(0, 7).map((p, i) => [i * 380, () => {
          on(p); count.textContent = i + 1; if (anim) Sound.sfx(i === 3 ? 'coin' : 'pop');
        }]).concat([[1600, () => on(lab1)], [7 * 380 + 200, () => on(lab2)]]));
      },
    },
    {
      name: 'The Missing Pie',
      q: `Someone ate ${F(1, 4)} of the pie, then ${F(3, 8)} more. How much is <b>left</b>?`,
      a: `${F(1, 4)} = ${F(2, 8)}. Eaten: ${F(2, 8)} + ${F(3, 8)} = ${F(5, 8)}. Left: ${F(8, 8)} − ${F(5, 8)} = <b>${F(3, 8)}</b>.`,
      draw(g) {
        const cx = 400, cy = 205, r = 190, slices = [];
        for (let i = 0; i < 8; i++) {
          const a0 = -Math.PI / 2 + i * Math.PI / 4, a1 = a0 + Math.PI / 4;
          const p = (a, rr = r) => `${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`;
          const s = S('path', { d: `M${cx} ${cy} L${p(a0)} A${r} ${r} 0 0 1 ${p(a1)} Z`, class: 'au-slice', style: `--dx:${(Math.cos(a0 + Math.PI / 8) * 14).toFixed(1)}px;--dy:${(Math.sin(a0 + Math.PI / 8) * 14).toFixed(1)}px` });
          g.append(s); slices.push(s);
        }
        g.append(S('circle', { cx, cy, r, fill: 'none', stroke: INK, 'stroke-width': 7 }));
        const leg = (y, cls, label) => {
          const lg = S('g', { class: 'au-x' }, S('rect', { x: 700, y: y - 34, width: 50, height: 44, rx: 8, class: 'au-sw ' + cls }), txt(770, y, label, 'au-leg', 'start'));
          g.append(lg); return lg;
        };
        const L1 = leg(110, 'a', 'ate 1/4 = 2/8'), L2 = leg(195, 'b', 'then ate 3/8'), L3 = leg(280, 'c', '3/8 left!');
        const mark = (idx, cls) => idx.forEach(i => slices[i].classList.add(cls));
        return anim => seq(anim, [[0, () => { mark([0, 1], 'ate-a'); on(L1); if (anim) Sound.sfx('chop'); }],
          [1300, () => { mark([2, 3, 4], 'ate-b'); on(L2); if (anim) Sound.sfx('chop'); }],
          [2600, () => { mark([5, 6, 7], 'left'); on(L3); if (anim) Sound.sfx('sparkle'); }]]);
      },
    },
    {
      name: 'The Boba Budget',
      q: `Mr. Ledger drinks ${F(2, 5)} of a boba every day. How much does he drink in <b>3 days</b>?`,
      a: `3 × ${F(2, 5)} = ${F(6, 5)} = ${F(5, 5)} + ${F(1, 5)} = <b>1 whole boba and ${F(1, 5)}</b>, which is 1${F(1, 5)}.`,
      draw(g) {
        const CUP = 'M0 0 H130 L114 250 Q112 262 100 262 H30 Q18 262 16 250 Z';
        const cup = (x, y, filled, label) => {
          const id = 'auc' + (++uid), segs = [];
          const cg = S('g', { transform: `translate(${x} ${y})` });
          cg.append(S('clipPath', { id }, S('path', { d: CUP })), S('path', { d: CUP, fill: '#f6f0e4' }));
          const inner = S('g', { 'clip-path': `url(#${id})` });
          for (let i = 0; i < 5; i++) {
            const s = S('rect', { x: 0, y: 262 - (i + 1) * 52.4, width: 130, height: 52.4, class: 'au-tea' + (i < filled ? ' on' : '') });
            inner.append(s); segs.push(s);
          }
          for (let i = 1; i < 5; i++) inner.append(S('line', { x1: 0, y1: 262 - i * 52.4, x2: 130, y2: 262 - i * 52.4, stroke: 'rgba(29,18,51,.35)', 'stroke-width': 3 }));
          cg.append(inner, S('rect', { x: 80, y: -60, width: 14, height: 120, rx: 6, fill: '#ff6fb5', stroke: INK, 'stroke-width': 4, transform: 'rotate(12 87 0)' }),
            S('path', { d: CUP, fill: 'none', stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round' }), txt(65, 310, label, 'au-small'));
          g.append(cg);
          return segs;
        };
        const days = [cup(60, 70, 2, 'Day 1'), cup(240, 70, 2, 'Day 2'), cup(420, 70, 2, 'Day 3')];
        const arrow = S('g', { class: 'au-x' }, S('path', { d: 'M600 200 H690 M665 170 L700 200 L665 230', fill: 'none', stroke: '#c4202f', 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
        g.append(arrow);
        const outA = cup(760, 70, 0, ''), outB = cup(950, 70, 0, '');
        const labA = S('g', { class: 'au-x' }, txt(825, 385, '5/5 = 1 whole', 'au-note good')), labB = S('g', { class: 'au-x' }, txt(1015, 385, '1/5', 'au-note'));
        g.append(labA, labB);
        const from = [days[0][1], days[0][0], days[1][1], days[1][0], days[2][1], days[2][0]];
        const to = [outA[0], outA[1], outA[2], outA[3], outA[4], outB[0]];
        return anim => seq(anim, [[0, () => on(arrow)]].concat(from.map((f, i) => [500 + i * 420, () => {
          on(f, false); on(to[i]); if (anim) Sound.sfx('blip');
        }]), [[500 + 5 * 420 + 300, () => { on(labA); on(labB); }]]));
      },
    },
  ];

  /* run [ms, fn] beats: on a timer when animating, all at once otherwise */
  function seq(anim, beats) {
    beats.forEach(([ms, fn]) => (anim ? later(fn, ms) : fn()));
    return beats.reduce((m, [ms]) => Math.max(m, ms), 0);
  }

  /* ---------------- rendering a step ---------------- */
  function renderCover() {
    ui.paper.className = 'au-paper cover';
    ui.caseNo.textContent = 'CASE FILES';
    ui.q.innerHTML = '';
    ui.vis.replaceChildren(el('div', { class: 'au-cover' },
      el('div', { class: 'au-cover-t', text: 'The Audit' }),
      el('div', { class: 'au-cover-s', text: 'Five cases. Show your work.' }),
      el('ol', { class: 'au-cases' }, ...CASES.map(c => el('li', { text: c.name })))));
    ui.ans.classList.remove('show'); ui.stamp.classList.remove('slam');
  }

  function renderCase(k, revealed, animate) {
    const c = CASES[k];
    ui.paper.className = 'au-paper';
    ui.caseNo.textContent = `CASE ${k + 1} OF ${CASES.length}`;
    ui.q.innerHTML = c.q;
    const svg = S('svg', { class: 'au-svg', viewBox: '0 0 1180 420' });
    const host = el('div', { class: 'au-vis-in' }, svg);
    ui.vis.replaceChildren(host);
    const reveal = c.draw(svg, host);
    ui.ans.innerHTML = '';
    ui.ans.append(el('div', { class: 'au-ans-h', text: 'FINDINGS' }), el('div', { class: 'au-ans-b', html: c.a }), ui.stamp);
    ui.ans.classList.remove('show'); ui.stamp.classList.remove('slam');
    if (!revealed) return;
    const end = reveal(animate);
    const finish = () => {
      ui.ans.classList.add('show');
      ui.stamp.classList.add('slam');
      if (animate) { Sound.sfx('thud'); later(() => Sound.sfx('ding'), 120); }
    };
    animate ? later(finish, end + 700) : finish();
  }

  function show(n, dir) {
    clearTimers();
    const animate = dir > 0 && n === shown + 1;
    shown = n;
    if (n === 0) { renderCover(); say('ledger/au-intro', 'lecture', animate || dir === undefined); return; }
    const k = Math.floor((n - 1) / 2), revealed = n % 2 === 0;
    renderCase(k, revealed, animate);
    if (animate) bump(ui.paper, revealed ? 'au-nudge' : 'au-in');
    const key = `ledger/au-${revealed ? 'a' : 'q'}${k + 1}`;
    const pose = revealed ? (k === 2 ? 'horrified' : k === 3 ? 'unimpressed' : 'delighted') : (k === 2 ? 'horrified' : 'lecture');
    say(key, pose, animate);
  }

  function build(r) {
    root = r;
    r.append(art('bg-office.png', 'bg'), el('div', { class: 'lg-vignette' }));
    ui.poses = {};
    ui.squash = el('div', { class: 'lg-ledger-squash' });
    ['lecture', 'unimpressed', 'horrified', 'delighted'].forEach(p => {
      const img = art(`ledger-${p}.png`, 'lg-pose' + (p === 'lecture' ? ' on' : ''), 'Mr. Ledger');
      ui.poses[p] = img; ui.squash.append(img);
    });
    r.append(el('div', { class: 'lg-ledger' }, el('div', { class: 'lg-ledger-bob' }, ui.squash)));
    r.append(el('div', { class: 'lg-plate' }, el('div', { class: 'lg-plate-name', text: 'Pennington P. Ledger III' }), el('div', { class: 'lg-plate-sub', text: 'Chief Fraction Auditor' })));
    ui.typed = el('span', { class: 'lg-typed' }); ui.rest = el('span', { class: 'lg-rest' });
    ui.bubble = el('div', { class: 'bubble tail-down lg-bubble lg-hide' }, ui.typed, ui.rest);
    r.append(ui.bubble);

    ui.caseNo = el('div', { class: 'au-caseno' });
    ui.q = el('div', { class: 'au-q' });
    ui.vis = el('div', { class: 'au-vis' });
    ui.stamp = el('div', { class: 'au-stamp', text: 'APPROVED' });
    ui.ans = el('div', { class: 'au-ans' });
    ui.paper = el('div', { class: 'au-paper' },
      el('div', { class: 'au-head' }, el('div', { class: 'au-title', text: 'OFFICIAL FRACTION AUDIT' }), ui.caseNo),
      ui.q, ui.vis, ui.ans);
    r.append(el('div', { class: 'au-board' }, el('div', { class: 'au-clip' }), ui.paper));
  }

  Deck.add({
    id: 'ledger-audit', music: 'office', title: "Ledger's Audit", theme: 'lg au', steps: 1 + CASES.length * 2,
    build,
    enter() { shown = -1; },
    step(n, dir) { show(n, dir); },
    leave() { clearTimers(); clearInterval(typeTimer); Sound.stopVoice(); shown = -1; },
  });
  window.AuditLines = LINES;
})();
