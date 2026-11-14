/* Merge sort with Coach Halfway.
 * Step 0: 8 blob kids holding number cards. The team splits in half, then quarters, then eighths
 *         (a group of 1 is already sorted), then merges back up: the two kids at the front of each
 *         line compare cards and the smaller one steps forward. A recursion tree underneath shows
 *         every row as a fraction of the team. Controls: Shuffle, Play/Pause, Step, speed.
 * Step 1: "What just happened?" recap panel (Split / Stop / Merge).
 */
(function () {
  const { el } = Deck;
  const INK = '#1d1233';
  const N = 8;
  // floor layout: the main line stands at FLOOR; merged kids step OUT pixels forward
  const SLOT = 144, CX = 1165, FLOOR = 476, OUT = 200, GAP = [0, 70, 40, 20];
  // recursion tree layout
  const TSLOT = 100, TCX = 960, TGAP = [0, 36, 20, 10], TREE_TOP = 716, ROW_H = 62;
  const DEPTH_COLORS = ['#b18cff', '#5ab8ff', '#22d3c5', '#9be15d'];
  const KS = 1; // kid art scale

  /* Every line Coach Halfway says. Keys map to assets/audio/voice/<key>.mp3 (see coach-lines.json). */
  const LINES = {
    'coach/intro': "Okay team, line up! Let's merge sort, just like we did in class!",
    'coach/split': 'Split in half! Left team, right team!',
    'coach/split-2': "Halves of halves! That's quarters! Split again!",
    'coach/split-3': "Split again! Eighths! Everybody's on their own now!",
    'coach/one': "Group of one? Already sorted! That's the stopping rule!",
    'coach/merge': 'Now merge! Compare the two in front. Smaller one steps up!',
    'coach/merge-2': 'Pairs make fours! Same rule!',
    'coach/merge-3': 'Last merge! Two halves make a whole!',
    'coach/rest': 'Nobody left to compare? Just walk right in!',
    'coach/done': 'SORTED! Every single one! That is championship hustle!',
    'coach/shuffle': 'Shuffle up! New lineup, team!',
    'coach/recap': "Split, split, split. Then merge, merge, merge. That's merge sort, and that's recursion!",
  };

  /* ---------------- little synth effects of our own (whistle, hops) ---------------- */
  const CoachFX = (function () {
    let ac = null, out = null;
    function ctx() {
      if (!ac) {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        out = ac.createGain(); out.gain.value = 0.55; out.connect(ac.destination);
      }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    }
    const off = () => window.Sound && Sound.muted;
    function env(g, t, a, peak, d) {
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.setValueAtTime(peak, t + Math.max(a, d - 0.04));
      g.gain.linearRampToValueAtTime(0, t + d);
    }
    function whistle() {
      if (off()) return;
      try {
        const c = ctx(), t0 = c.currentTime + 0.01;
        [[0, 0.14], [0.2, 0.5]].forEach(([s, d]) => {
          const t = t0 + s;
          const o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain();
          o.type = 'sine'; o.frequency.setValueAtTime(2550, t); o.frequency.linearRampToValueAtTime(2750, t + 0.05);
          lfo.type = 'square'; lfo.frequency.value = 42; lg.gain.value = 160;
          lfo.connect(lg).connect(o.frequency);
          env(g, t, 0.012, 0.13, d);
          o.connect(g).connect(out);
          o.start(t); lfo.start(t); o.stop(t + d + 0.05); lfo.stop(t + d + 0.05);
          // breath
          const len = Math.ceil(c.sampleRate * d), buf = c.createBuffer(1, len, c.sampleRate), ch = buf.getChannelData(0);
          for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
          const src = c.createBufferSource(); src.buffer = buf;
          const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2700; bp.Q.value = 3;
          const ng = c.createGain(); env(ng, t, 0.01, 0.07, d);
          src.connect(bp).connect(ng).connect(out); src.start(t); src.stop(t + d + 0.05);
        });
      } catch (e) {}
    }
    function tone(f0, f1, dur, vol, type = 'sine', at = 0) {
      if (off()) return;
      try {
        const c = ctx(), t = c.currentTime + at;
        const o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02);
      } catch (e) {}
    }
    // pentatonic notes so a row of hops sounds like music
    const PENTA = [0, 2, 4, 7, 9];
    const note = i => 330 * Math.pow(2, (PENTA[i % 5] + 12 * Math.floor(i / 5)) / 12);
    return {
      whistle,
      hop: i => { const f = note(i); tone(f * 0.6, f * 1.5, 0.16, 0.13, 'sine'); },
      land: () => tone(160, 70, 0.1, 0.12, 'sine'),
      note: (i, at = 0) => { const f = note(i); tone(f, f, 0.22, 0.1, 'triangle', at); },
      low: () => tone(420, 300, 0.12, 0.12, 'triangle'),
      high: () => tone(640, 900, 0.12, 0.1, 'triangle'),
    };
  })();
  window.CoachFX = CoachFX;

  /* ---------------- the kids ---------------- */
  const LOOKS = [
    { c: '#ff6fb5', w: 94, h: 130, hair: 'pigtails', hc: '#6b3416', acc: 'freckles', bow: '#ffc93c' },
    { c: '#5ab8ff', w: 104, h: 138, hair: 'bun', hc: '#2b1650', acc: 'glasses' },
    { c: '#9be15d', w: 90, h: 128, hair: 'bow', hc: '#5a2a12', bow: '#ff4f5e', acc: 'lashes' },
    { c: '#ffc93c', w: 106, h: 146, hair: 'afro', hc: '#3a1d0e' },
    { c: '#b18cff', w: 92, h: 130, hair: 'ponytail', hc: '#ff9a3c', bow: '#22d3c5', acc: 'lashes' },
    { c: '#ff9a3c', w: 110, h: 130, hair: 'bangs', hc: '#7a3b12', acc: 'freckles' },
    { c: '#22d3c5', w: 88, h: 150, hair: 'braids', hc: '#4a2370', bow: '#ff6fb5' },
    { c: '#ff6b7d', w: 100, h: 130, hair: 'headband', hc: '#ffd166', bow: '#7b3fe4', acc: 'lashes' },
    { c: '#7fd6ff', w: 94, h: 140, hair: 'spiky', hc: '#ff6fb5' },
    { c: '#f5a3ff', w: 102, h: 128, hair: 'spacebuns', hc: '#4a2a7a', bow: '#9be15d' },
    { c: '#c7f464', w: 90, h: 134, hair: 'curly', hc: '#8b4513', acc: 'glasses' },
  ];

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = v => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt);
    return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join('');
  }

  const STAR_PTS = (() => {
    const p = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 10 : 22;
      p.push((24 + r * Math.cos(a)).toFixed(1) + ',' + (25 + r * Math.sin(a)).toFixed(1));
    }
    return p.join(' ');
  })();
  const STAR_SVG = `<svg viewBox="0 0 48 48"><polygon points="${STAR_PTS}" fill="#ffc93c" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><circle cx="19" cy="20" r="3" fill="#fff8d0"/></svg>`;
  const ARROW_L = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ARROW_R = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M9 4l8 8-8 8" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function kidSVG(L, i) {
    const cx = 70, B = 186, rx = L.w / 2, ry = L.h / 2, cy = B - ry, T = cy - ry;
    const Rx = rx + 4, Ry = ry + 4;
    const P = (deg, kx = Rx, ky = Ry) => { const a = deg * Math.PI / 180; return [cx + kx * Math.cos(a), cy - ky * Math.sin(a)]; };
    const f = v => v.toFixed(1);
    const pt = p => f(p[0]) + ' ' + f(p[1]);
    const hc = L.hc, st = `stroke="${INK}" stroke-width="4" stroke-linejoin="round"`;
    const hair = `fill="${hc}" ${st}`;
    const acc = L.bow || '#ff4f5e';
    let back = '', front = '', top = T;

    function cap(th = 14, blunt = false, n = 4) {
      const a = P(180 - th), b = P(th), fy = cy - ry * 0.6;
      let d = `M${pt(a)} A${f(Rx)} ${f(Ry)} 0 0 1 ${pt(b)} L${f(b[0] - 8)} ${f(fy)}`;
      const x0 = b[0] - 8, x1 = a[0] + 8, dx = (x1 - x0) / n;
      for (let k = 0; k < n; k++) {
        if (blunt) d += ` L${f(x0 + dx * (k + 1))} ${f(fy + (k % 2 ? 2 : 6))}`;
        else d += ` Q${f(x0 + dx * (k + 0.5))} ${f(fy + 17)} ${f(x0 + dx * (k + 1))} ${f(fy)}`;
      }
      d += ' Z';
      return `<path d="${d}" ${hair}/>`;
    }
    const circ = (x, y, r, fill = hc) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${fill}" ${st}/>`;
    const bowAt = (x, y, s = 1, fill = acc) =>
      `<g transform="translate(${f(x)} ${f(y)}) scale(${s})"><path d="M0 0 L-20 -13 L-20 13 Z M0 0 L20 -13 L20 13 Z" fill="${fill}" ${st}/>${circ(0, 0, 6, fill)}</g>`;

    switch (L.hair) {
      case 'pigtails': {
        const y = cy - ry * 0.28;
        back += circ(cx - Rx - 9, y + 6, 17) + circ(cx + Rx + 9, y + 6, 17);
        front += cap(14) + circ(cx - Rx + 1, y, 6.5, acc) + circ(cx + Rx - 1, y, 6.5, acc);
        break;
      }
      case 'bun':
        back += circ(cx, T - 8, 20); front += cap(12, false, 3); top = T - 30; break;
      case 'spacebuns': {
        const a = P(128), b = P(52);
        back += circ(a[0] - 4, a[1] - 6, 17) + circ(b[0] + 4, b[1] - 6, 17);
        front += cap(14, false, 5); top = T - 18; break;
      }
      case 'ponytail': {
        const x = cx + Rx * 0.45, y = T + 10;
        back += `<path d="M${f(x)} ${f(y)} C${f(cx + Rx + 46)} ${f(T - 14)} ${f(cx + Rx + 40)} ${f(cy + 4)} ${f(cx + Rx + 14)} ${f(cy + 26)} C${f(cx + Rx + 16)} ${f(cy - 8)} ${f(cx + Rx - 2)} ${f(T + 26)} ${f(x)} ${f(y)} Z" ${hair}/>`;
        front += cap(12, false, 4) + circ(cx + Rx * 0.62, T + 12, 7, acc); break;
      }
      case 'afro':
        for (let a = -10; a <= 190; a += 22) { const p = P(a, Rx + 8, Ry + 8); back += circ(p[0], p[1], 21); }
        front += cap(10, false, 5); top = T - 26; break;
      case 'bangs':
        front += cap(16, true, 6); break;
      case 'bow':
        front += `<path d="M${cx - 6} ${T + 4} q-2 -16 12 -14 q-10 4 -4 14" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>` + bowAt(cx + 16, T + 6, 1.05);
        top = T - 14; break;
      case 'headband': {
        front += cap(14, false, 4);
        const a = P(160, Rx - 1, Ry - 1), b = P(20, Rx - 1, Ry - 1);
        front += `<path d="M${pt(a)} A${f(Rx - 4)} ${f(Ry - 14)} 0 0 1 ${pt(b)}" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>`;
        front += `<path d="M${pt(a)} A${f(Rx - 4)} ${f(Ry - 14)} 0 0 1 ${pt(b)}" fill="none" stroke="${acc}" stroke-width="7" stroke-linecap="round"/>`;
        const fl = P(140, Rx - 4, Ry - 14);
        front += [0, 72, 144, 216, 288].map(r => `<circle cx="${f(fl[0] + 9 * Math.cos(r * Math.PI / 180))}" cy="${f(fl[1] - 8 + 9 * Math.sin(r * Math.PI / 180))}" r="7" fill="#fff" stroke="${INK}" stroke-width="3"/>`).join('') + circ(fl[0], fl[1] - 8, 5, '#ffc93c');
        break;
      }
      case 'braids':
        [-1, 1].forEach(s => {
          const x = cx + s * (Rx - 2);
          for (let k = 0; k < 4; k++) back += `<ellipse cx="${f(x + s * 4)}" cy="${f(cy - ry * 0.3 + k * 17)}" rx="10" ry="11" fill="${hc}" ${st}/>`;
          back += circ(x + s * 4, cy - ry * 0.3 + 66, 6, acc);
        });
        front += cap(16, false, 4); break;
      case 'spiky':
        front += `<path d="M${cx - 26} ${T + 12} L${cx - 22} ${T - 18} L${cx - 8} ${T + 2} L${cx} ${T - 26} L${cx + 9} ${T + 2} L${cx + 24} ${T - 16} L${cx + 26} ${T + 12} Z" ${hair}/>` + cap(14, false, 4);
        top = T - 26; break;
      case 'curly':
        [150, 170, 192, 212, 30, 10, -12, -32].forEach(a => { const p = P(a, Rx + 6, Ry + 2); back += circ(p[0], p[1], 15); });
        front += cap(12, false, 5); break;
    }

    const ey = cy - ry * 0.2, ex = rx * 0.36, my = cy + ry * 0.04;
    const eye = s => {
      const x = cx + s * ex;
      const lash = L.acc === 'lashes' ? `<path d="M${f(x + s * 8)} ${f(ey - 9)} l${s * 7} -6 M${f(x + s * 3)} ${f(ey - 12)} l${s * 4} -7" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` : '';
      return `<ellipse cx="${f(x)}" cy="${f(ey)}" rx="10" ry="12.5" fill="#fff" stroke="${INK}" stroke-width="3"/>${lash}` +
        `<g class="qs-pupil"><circle cx="${f(x)}" cy="${f(ey + 1.5)}" r="6" fill="${INK}"/><circle cx="${f(x + 2)}" cy="${f(ey - 1.5)}" r="2.2" fill="#fff"/></g>`;
    };
    const glasses = L.acc === 'glasses'
      ? `<g fill="none" stroke="${INK}" stroke-width="3.5"><circle cx="${f(cx - ex)}" cy="${f(ey)}" r="16"/><circle cx="${f(cx + ex)}" cy="${f(ey)}" r="16"/><path d="M${f(cx - ex + 16)} ${f(ey - 2)} Q${cx} ${f(ey - 8)} ${f(cx + ex - 16)} ${f(ey - 2)}"/></g>` : '';
    const freckles = L.acc === 'freckles'
      ? [-1, 1].map(s => [[0, 0], [7, -3], [5, 5]].map(([dx, dy]) => `<circle cx="${f(cx + s * (rx * 0.56 + dx))}" cy="${f(cy - ry * 0.02 + dy)}" r="1.8" fill="${shade(L.c, -0.5)}"/>`).join('')).join('') : '';
    const cardR = ((i * 37) % 9) - 4;
    const svgStr = `<svg class="qs-art" viewBox="0 0 140 200" width="140" height="200">
      <defs><radialGradient id="qsg${i}" cx="36%" cy="28%" r="80%"><stop offset="0" stop-color="${shade(L.c, 0.4)}"/><stop offset=".55" stop-color="${L.c}"/><stop offset="1" stop-color="${shade(L.c, -0.25)}"/></radialGradient></defs>
      ${back}
      <ellipse cx="${cx}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#qsg${i})" ${st}/>
      <ellipse cx="${f(cx - rx * 0.45)}" cy="${f(cy - ry * 0.52)}" rx="${f(rx * 0.16)}" ry="${f(ry * 0.09)}" transform="rotate(-35 ${f(cx - rx * 0.45)} ${f(cy - ry * 0.52)})" fill="#fff" opacity=".6"/>
      ${front}
      <g class="qs-eyes">${eye(-1)}${eye(1)}</g>${glasses}
      <ellipse cx="${f(cx - rx * 0.6)}" cy="${f(cy + ry * 0.02)}" rx="9" ry="5.5" fill="#ff3d7f" opacity=".42"/>
      <ellipse cx="${f(cx + rx * 0.6)}" cy="${f(cy + ry * 0.02)}" rx="9" ry="5.5" fill="#ff3d7f" opacity=".42"/>${freckles}
      <path class="m m-smile" d="M${cx - 9} ${f(my)} Q${cx} ${f(my + 9)} ${cx + 9} ${f(my)}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
      <path class="m m-happy" d="M${cx - 12} ${f(my - 2)} Q${cx} ${f(my + 18)} ${cx + 12} ${f(my - 2)} Z" fill="#8a1538" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <ellipse class="m m-o" cx="${cx}" cy="${f(my + 3)}" rx="6" ry="7.5" fill="#8a1538" stroke="${INK}" stroke-width="3.5"/>
      <ellipse cx="${cx - 22}" cy="${B + 4}" rx="14" ry="8" fill="${shade(L.c, -0.45)}" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="${cx + 22}" cy="${B + 4}" rx="14" ry="8" fill="${shade(L.c, -0.45)}" stroke="${INK}" stroke-width="3"/>
      <g transform="rotate(${cardR} ${cx} ${B - 20})"><g class="qs-card">
        <rect x="${cx - 32}" y="${B - 50}" width="64" height="64" rx="10" fill="#fff" stroke="${INK}" stroke-width="4"/>
        <text class="qs-num" x="${cx}" y="${B - 1}" text-anchor="middle" font-family="Bungee, Impact, sans-serif" font-size="34" fill="${INK}">0</text>
        <circle cx="${cx - 32}" cy="${B - 14}" r="9" fill="${L.c}" stroke="${INK}" stroke-width="3.5"/>
        <circle cx="${cx + 32}" cy="${B - 14}" r="9" fill="${L.c}" stroke="${INK}" stroke-width="3.5"/>
      </g></g>
    </svg>`;
    return { svgStr, top };
  }

  function makeKid(L, i) {
    const { svgStr, top } = kidSVG(L, i);
    const node = el('div', { class: 'qs-kid' });
    node.style.setProperty('--i', i);
    const shadow = el('div', { class: 'qs-shadow' });
    const hop = el('div', { class: 'qs-hop' });
    const bounce = el('div', { class: 'qs-bounce', html: svgStr });
    const star = el('div', { class: 'qs-star', html: STAR_SVG, style: { top: (top - 60) + 'px' } });
    const tag = el('div', { class: 'qs-tag', style: { top: (top - 50) + 'px' } });
    bounce.append(star, tag);
    hop.append(bounce);
    node.append(shadow, hop);
    return {
      i, L, node, hop, bounce, shadow, star, tag, card: bounce.querySelector('.qs-card'),
      num: bounce.querySelector('.qs-num'),
      headTop: top, x: 0, y: 0, fwd: 0, val: 0, lab: null, pos: 0,
    };
  }

  function setCard(k) {
    k.num.textContent = k.val;
    k.num.setAttribute('font-size', k.val > 9 ? 27 : 34);
  }
  const frac = (n, d) => `<span class="qs-mf"><span>${n}</span><span>${d}</span></span>`;

  /* ---------------- layout ---------------- */
  const lvl = b => b % 4 === 0 ? 1 : b % 2 === 0 ? 2 : 3; // boundary b sits between slots b-1 and b
  function spread(p, slot, gaps, cx) {
    let g = 0, tot = 0;
    for (let b = 1; b < N; b++) { const w = gaps[lvl(b)]; tot += w; if (b <= p) g += w; }
    return cx + (p - (N - 1) / 2) * slot + g - tot / 2;
  }
  const fullX = p => spread(p, SLOT, GAP, CX);
  const treeX = p => spread(p, TSLOT, TGAP, TCX);
  /* A kid packs with the others in its block (slots joined by closed boundaries), centred where that
   * block sits when every gap is open. Opening or closing a gap only moves the kids it touches. */
  function slotX(p) {
    let lo = p, hi = p;
    while (lo > 0 && !S.open[lo]) lo--;
    while (hi < N - 1 && !S.open[hi + 1]) hi++;
    return (fullX(lo) + fullX(hi)) / 2 + (p - (lo + hi) / 2) * SLOT;
  }

  /* ---------------- planning: run merge sort once and record every beat ---------------- */
  function plan(order, vals) {
    const a = order.slice(), ev = [];
    let finalComps = 0;
    ev.push({ t: 'start', ids: a.slice() });
    for (let d = 1; d <= 3; d++) {
      const size = N >> d, groups = [];
      for (let lo = 0; lo < N; lo += size) groups.push({ lo, hi: lo + size - 1, ids: a.slice(lo, lo + size) });
      ev.push({ t: 'split', d, groups });
    }
    ev.push({ t: 'singles' });
    for (let d = 2; d >= 0; d--) {
      const size = N >> d, half = size / 2;
      for (let lo = 0; lo < N; lo += size) {
        const mid = lo + half, hi = lo + size - 1;
        const A = a.slice(lo, mid), B = a.slice(mid, hi + 1), out = [];
        ev.push({ t: 'mstart', d, lo, mid, hi, first: lo === 0 });
        let i = 0, j = 0, c = 0;
        const take = (k, vs) => { ev.push({ t: 'take', d, lo, k, vs, to: lo + out.length }); out.push(k); };
        while (i < A.length && j < B.length) {
          c++;
          const x = A[i], y = B[j];
          if (vals[x] < vals[y]) { i++; take(x, y); } else { j++; take(y, x); }
        }
        while (i < A.length) take(A[i++], null);
        while (j < B.length) take(B[j++], null);
        out.forEach((k, n) => { a[lo + n] = k; });
        ev.push({ t: 'mend', d, lo, hi });
        if (d === 0) finalComps = c;
      }
    }
    ev.push({ t: 'done' });
    return { ev, finalComps };
  }

  function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function newGame() {
    const vals = shuffled([...Array(20)].map((_, i) => i + 1)).slice(0, N);
    for (let tries = 0; tries < 500; tries++) {
      const order = shuffled([...Array(N)].map((_, i) => i));
      const p = plan(order, vals);
      if (p.finalComps >= 6) return { vals, order, ev: p.ev }; // a long, dramatic last merge
    }
    const order = shuffled(vals.map((_, i) => i));
    return { vals, order, ev: plan(order, vals).ev };
  }

  /* ---------------- state, timers, animation ---------------- */
  const S = {
    root: null, kids: [], pos: [], open: [], ev: [], ei: 0, playing: false, speed: 1, epoch: 0, cur: null, loopId: 0,
    done: false, comps: 0, nodes: {}, said: {}, entered: false,
  };
  const timers = new Set(), rafs = new Set();
  const alive = tok => tok === S.epoch;

  function wait(ms, tok) {
    return new Promise(res => {
      if (!alive(tok)) return;
      const id = setTimeout(() => { timers.delete(id); if (alive(tok)) res(); }, ms / S.speed);
      timers.add(id);
    });
  }
  function later(fn, ms) { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; }
  function anim(ms, fn, tok) {
    ms /= S.speed;
    return new Promise(res => {
      if (!alive(tok)) return;
      const t0 = performance.now();
      let id;
      const tick = now => {
        rafs.delete(id);
        if (!alive(tok)) return;
        const t = Math.min(1, (now - t0) / ms);
        fn(t);
        if (t < 1) { id = requestAnimationFrame(tick); rafs.add(id); } else res();
      };
      id = requestAnimationFrame(tick); rafs.add(id);
    });
  }
  function stopAll() {
    S.epoch++;
    timers.forEach(clearTimeout); timers.clear();
    rafs.forEach(cancelAnimationFrame); rafs.clear();
    S.cur = null; S.playing = false;
  }

  const easeIO = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  function place(k) {
    k.node.style.transform = `translate(${(k.x - 70).toFixed(1)}px, ${(FLOOR - 200 + k.fwd).toFixed(1)}px)`;
    k.node.style.zIndex = k.fwd > OUT / 2 ? 3 : 1;
    k.hop.style.transform = `translateY(${(-k.y).toFixed(1)}px) scale(${KS})`;
    const s = Math.max(0.4, 1 - k.y / 240);
    k.shadow.style.transform = `scale(${s.toFixed(3)})`;
    k.shadow.style.opacity = s.toFixed(3);
  }

  function hopTo(k, x2, tok, { h = 80, ms = 600, fwd2 = k.fwd, sound = true } = {}) {
    const x1 = k.x, f1 = k.fwd;
    if (sound) CoachFX.hop(rank(k));
    return anim(ms, t => {
      const e = easeIO(t);
      k.x = x1 + (x2 - x1) * e; k.fwd = f1 + (fwd2 - f1) * e; k.y = Math.sin(Math.PI * t) * h;
      place(k);
    }, tok).then(() => { k.y = 0; place(k); Deck.bump(k.bounce, 'land'); });
  }

  function rank(k) { return S.kids.filter(o => o.val < k.val).length; }

  /* ---------------- UI helpers ---------------- */
  function say(key) {
    const text = LINES[key];
    if (!text) return;
    S.bubbleText.textContent = text;
    S.bubble.classList.remove('hidden-b');
    Deck.bump(S.bubble, 'pop');
    Deck.bump(S.coachImg, 'talk');
    S.voiceEl = Sound.voice(key);
  }
  /* Voice lines are never cut off: beats that talk wait (in real time, whatever the speed) for the last line to end. */
  const voicePlaying = () => { const a = S.voiceEl; return !!a && !a.paused && !a.ended && !a.error && !Sound.muted; };
  function voiceDone(tok) {
    return new Promise(res => {
      const check = () => { if (!alive(tok)) return; if (!voicePlaying()) res(); else later(check, 100); };
      check();
    });
  }
  async function talk(key, tok) { await voiceDone(tok); if (alive(tok)) say(key); }
  function tweet() {
    Deck.bump(S.tweet, 'show');
    Deck.bump(S.coachImg, 'talk');
    CoachFX.whistle();
  }
  function setBoard() {
    S.compEl.textContent = String(S.comps).padStart(2, '0');
  }
  function setGroup(d) {
    S.groupEl.innerHTML = d === 0 ? '1' : `1/${1 << d}`;
    Deck.bump(S.groupEl, 'tick');
    S.rowLabs.forEach((r, i) => r.classList.toggle('on', i === d));
  }
  function setPlayBtn() {
    const b = S.playBtn;
    const state = S.playing ? 'pause' : S.done ? 'again' : 'play';
    b.dataset.state = state;
    b.querySelector('span').textContent = state === 'pause' ? 'PAUSE' : state === 'again' ? 'AGAIN!' : 'PLAY';
    b.classList.toggle('red', state === 'pause');
  }
  function setZone(lo, hi, d) {
    const z = S.zone;
    if (lo == null) { z.classList.remove('on'); return; }
    z.style.left = (slotX(lo) - SLOT / 2 + 6) + 'px';
    z.style.width = (slotX(hi) - slotX(lo) + SLOT - 12) + 'px';
    z.style.setProperty('--c', DEPTH_COLORS[d]);
    z.classList.add('on');
  }
  function sparkle(x, y, n = 10, color = '#ffc93c') {
    for (let i = 0; i < n; i++) {
      const s = el('div', { class: 'qs-spark' });
      s.style.left = x + 'px'; s.style.top = y + 'px'; s.style.background = i % 3 ? color : '#fff';
      S.fx.append(s);
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4, r = 60 + Math.random() * 50;
      s.animate([
        { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r}px)) scale(.2) rotate(180deg)`, opacity: 0 },
      ], { duration: 650, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => s.remove();
    }
  }
  function kidStarPoint(k) { return { x: k.x, y: FLOOR + k.fwd - (200 - (k.headTop - 34)) * KS }; }

  const nodeId = (d, lo) => d + ':' + lo;
  function addNode(d, lo, hi, ids) {
    const top = TREE_TOP + d * ROW_H, left = treeX(lo) - 28, width = treeX(hi) - treeX(lo) + 56;
    const c = DEPTH_COLORS[d];
    const n = el('div', { class: 'qs-node', style: { left: left + 'px', top: top + 'px', width: width + 'px' } });
    n.style.setProperty('--c', c);
    S.tree.append(n);
    if (d > 0) {
      const ln = el('div', { class: 'qs-link', style: { left: ((treeX(lo) + treeX(hi)) / 2 - 3) + 'px', top: (top - 10) + 'px' } });
      ln.style.setProperty('--c', c);
      S.tree.append(ln);
    }
    const chips = {};
    ids.forEach((k, j) => {
      const kid = S.kids[k];
      const ch = el('div', { class: 'qs-chip', text: kid.val, style: { left: (treeX(lo + j) - 20) + 'px', top: (top + 4) + 'px', animationDelay: (j * 30) + 'ms' } });
      ch.style.setProperty('--kc', kid.L.c);
      S.tree.append(ch);
      chips[k] = ch;
    });
    S.nodes[nodeId(d, lo)] = { el: n, chips };
  }
  function focusNode(id) {
    S.tree.querySelectorAll('.qs-node.on').forEach(x => x.classList.remove('on'));
    if (id) S.nodes[id].el.classList.add('on');
  }

  /* ---------------- the beats ---------------- */
  const SPLIT_LINES = [null, 'coach/split', 'coach/split-2', 'coach/split-3'];
  const MERGE_LINES = ['coach/merge-3', 'coach/merge-2', 'coach/merge'];
  const H = {
    async start(ev, tok) {
      addNode(0, 0, N - 1, ev.ids);
      S.rowLabs[0].classList.add('show');
      setGroup(0);
      focusNode(nodeId(0, 0));
      Sound.sfx('slide');
      await wait(600, tok);
    },
    async split(ev, tok) {
      await talk(SPLIT_LINES[ev.d], tok);
      tweet();
      for (let b = 1; b < N; b++) if (lvl(b) === ev.d) S.open[b] = true;
      Sound.sfx('whoosh');
      ev.groups.forEach(g => addNode(ev.d, g.lo, g.hi, g.ids));
      focusNode(null);
      S.rowLabs[ev.d].classList.add('show');
      setGroup(ev.d);
      await Promise.all(S.kids.map(k => wait((k.pos % (N >> ev.d)) * 40, tok).then(() =>
        hopTo(k, slotX(k.pos), tok, { h: 70, ms: 620, sound: k.pos % (N >> ev.d) === 0 }))));
      await wait(400, tok);
      await voiceDone(tok);
    },
    async singles(ev, tok) {
      S.kids.forEach((k, j) => later(() => {
        if (!alive(tok)) return;
        k.node.classList.add('happy');
        S.nodes[nodeId(3, k.pos)].el.classList.add('sorted');
        S.nodes[nodeId(3, k.pos)].chips[k.i].classList.add('sorted');
        const sp = kidStarPoint(k);
        sparkle(sp.x, sp.y, 8, '#9be15d');
        CoachFX.note(j);
      }, k.pos * 90));
      await talk('coach/one', tok);
      await wait(1000, tok);
      await voiceDone(tok);
    },
    async mstart(ev, tok) {
      S.open[ev.mid] = false;
      S.kids.forEach(k => {
        const inside = k.pos >= ev.lo && k.pos <= ev.hi;
        k.node.classList.toggle('dim', !inside);
        k.node.classList.remove('happy');
      });
      setZone(ev.lo, ev.hi, ev.d);
      focusNode(nodeId(ev.d, ev.lo));
      setGroup(ev.d);
      Sound.sfx('slide');
      // the two lines close up shoulder to shoulder
      await Promise.all(S.kids.filter(k => k.pos >= ev.lo && k.pos <= ev.hi).map(k =>
        hopTo(k, slotX(k.pos), tok, { h: 30, ms: 420, sound: false })));
      if (ev.first) { await talk(MERGE_LINES[ev.d], tok); await voiceDone(tok); }
      else await wait(250, tok);
    },
    async take(ev, tok) {
      const k = S.kids[ev.k], v = ev.vs == null ? null : S.kids[ev.vs];
      if (v) {
        S.comps++; setBoard(); Deck.bump(S.compEl, 'tick');
        k.tag.className = 'qs-tag show lt';
        k.tag.innerHTML = `<b>${k.val}<i>&lt;</i>${v.val}</b>`;
        k.node.classList.add('wow'); v.node.classList.add('wow');
        k.node.style.setProperty('--look', (v.x > k.x ? 3.5 : -3.5) + 'px');
        v.node.style.setProperty('--look', (k.x > v.x ? 3.5 : -3.5) + 'px');
        Deck.bump(k.bounce, 'nudge'); Deck.bump(v.bounce, 'nudge');
        CoachFX.low();
        await wait(750, tok);
        k.tag.classList.remove('show');
        v.node.classList.remove('wow');
        v.node.style.setProperty('--look', '0px');
      } else if (!S.said.rest) {
        S.said.rest = 1; await talk('coach/rest', tok); await voiceDone(tok);
      }
      k.node.classList.remove('wow');
      k.node.style.setProperty('--look', '0px');
      const node = S.nodes[nodeId(ev.d, ev.lo)];
      node.chips[k.i].style.left = (treeX(ev.to) - 20) + 'px';
      node.chips[k.i].classList.add('sorted');
      await hopTo(k, slotX(ev.to), tok, { h: 70, ms: 520, fwd2: OUT });
      k.pos = ev.to; S.pos[ev.to] = k;
      k.node.classList.add('happy');
      await wait(v ? 200 : 60, tok);
    },
    async mend(ev, tok) {
      const group = S.kids.filter(k => k.pos >= ev.lo && k.pos <= ev.hi);
      S.nodes[nodeId(ev.d, ev.lo)].el.classList.add('sorted');
      Sound.sfx('ding');
      // the merged line steps back into the row together
      await Promise.all(group.map(k => hopTo(k, k.x, tok, { h: 40, ms: 460, fwd2: 0, sound: false })));
      group.forEach(k => { const sp = kidStarPoint(k); sparkle(sp.x, sp.y, 6); });
      await wait(ev.d === 0 ? 200 : 450, tok);
    },
    async done(ev, tok) {
      setZone(null);
      focusNode(null);
      S.tree.classList.add('done');
      S.kids.forEach(k => { k.node.classList.remove('dim', 'wow'); k.node.classList.add('happy', 'locked'); k.node.style.setProperty('--look', '0px'); });
      S.done = true; S.playing = false; setPlayBtn();
      // a rising scale as everyone jumps in sorted order
      S.pos.forEach((k, j) => later(() => { Deck.bump(k.bounce, 'cheer'); CoachFX.note(j); }, j * 90));
      later(() => {
        Sound.sfx('fanfare');
        Deck.confetti(S.root, 170);
        S.banner.classList.add('show');
        say('coach/done');
      }, N * 90 + 150);
    },
  };

  function stepOnce() {
    if (S.cur) return S.cur;
    if (S.ei >= S.ev.length) return Promise.resolve();
    const ev = S.ev[S.ei++], tok = S.epoch;
    const p = H[ev.t](ev, tok).catch(e => console.error(e));
    const wrapped = p.then(() => { if (S.cur === wrapped) S.cur = null; });
    S.cur = wrapped;
    return wrapped;
  }

  async function loop() {
    const id = ++S.loopId, tok = S.epoch;
    while (S.playing && id === S.loopId && alive(tok) && S.ei < S.ev.length) {
      await stepOnce();
      if (!alive(tok)) return;
      await wait(110, tok);
    }
  }

  function play() {
    if (S.done) { shuffle(true); return; }
    S.playing = !S.playing;
    S.playBtn.classList.remove('qs-hint');
    setPlayBtn();
    if (S.playing) loop();
  }
  function stepBtn() {
    S.playBtn.classList.remove('qs-hint');
    if (S.done) return;
    S.playing = false; setPlayBtn();
    stepOnce();
  }

  /* Reset everything. animate=true makes the kids scramble to their new spots. */
  function reset(animate, thenPlay) {
    stopAll();
    const tok = S.epoch;
    const g = newGame();
    S.ev = g.ev; S.ei = 0; S.done = false; S.comps = 0; S.nodes = {}; S.said = {};
    S.open = Array(N).fill(false);
    S.tree.innerHTML = ''; S.tree.classList.remove('done');
    S.rowLabs.forEach(r => r.classList.remove('show', 'on'));
    S.groupEl.textContent = '1';
    S.banner.classList.remove('show');
    setZone(null);
    S.kids.forEach((k, i) => {
      k.val = g.vals[i];
      k.node.classList.remove('dim', 'locked', 'happy', 'wow');
      k.node.style.setProperty('--look', '0px');
      k.tag.classList.remove('show');
      k.bounce.classList.remove('cheer', 'land', 'nudge');
    });
    g.order.forEach((ki, p) => { S.kids[ki].pos = p; S.pos[p] = S.kids[ki]; });
    setBoard(); setPlayBtn();
    if (!animate) {
      S.kids.forEach(k => { setCard(k); k.x = slotX(k.pos); k.y = 0; k.fwd = 0; place(k); });
      return;
    }
    say('coach/shuffle');
    Sound.sfx('drum');
    const p = Promise.all(S.kids.map((k, j) => wait(j * 40, tok).then(() => {
      Deck.bump(k.card, 'flip');
      later(() => setCard(k), 180);
      const dist = Math.abs(slotX(k.pos) - k.x);
      return hopTo(k, slotX(k.pos), tok, { h: 60 + Math.min(140, dist * 0.2), ms: 700, fwd2: 0 });
    }))).then(() => { if (S.cur === p) S.cur = null; if (thenPlay && alive(tok)) { S.playing = true; setPlayBtn(); loop(); } });
    S.cur = p;
  }
  function shuffle(thenPlay) { S.playBtn.classList.remove('qs-hint'); reset(true, thenPlay); }

  /* ---------------- build ---------------- */
  const ICONS = {
    play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12.5-7.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="5" height="16" rx="1.5"/><rect x="14" y="4" width="5" height="16" rx="1.5"/></svg>',
    again: '<svg viewBox="0 0 24 24"><path d="M19 12a7 7 0 1 1-2.05-4.95M19 4v4h-4" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    step: '<svg viewBox="0 0 24 24"><path d="M5 4.5v15l10-7.5z"/><rect x="16" y="4.5" width="4" height="15" rx="1.2"/></svg>',
    dice: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4.5" fill="none" stroke="currentColor" stroke-width="2.6"/><circle cx="8" cy="8" r="1.8"/><circle cx="16" cy="8" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="8" cy="16" r="1.8"/><circle cx="16" cy="16" r="1.8"/></svg>',
  };

  function recapRow(cls, icon, label, text) {
    return el('div', { class: 'qs-rc-row ' + cls },
      el('div', { class: 'qs-rc-icon', html: icon }),
      el('div', { class: 'qs-rc-text' }, el('div', { class: 'qs-rc-label', text: label }), el('div', { class: 'qs-rc-desc', html: text })));
  }
  const TREE_BOXES = `
    <rect x="30" y="6" width="80" height="24" rx="8" fill="#b18cff" stroke="${INK}" stroke-width="4"/>
    <rect x="12" y="44" width="50" height="22" rx="7" fill="#5ab8ff" stroke="${INK}" stroke-width="4"/>
    <rect x="78" y="44" width="50" height="22" rx="7" fill="#5ab8ff" stroke="${INK}" stroke-width="4"/>
    <rect x="4" y="80" width="26" height="20" rx="6" fill="#22d3c5" stroke="${INK}" stroke-width="4"/>
    <rect x="42" y="80" width="26" height="20" rx="6" fill="#22d3c5" stroke="${INK}" stroke-width="4"/>
    <rect x="72" y="80" width="26" height="20" rx="6" fill="#22d3c5" stroke="${INK}" stroke-width="4"/>
    <rect x="110" y="80" width="26" height="20" rx="6" fill="#22d3c5" stroke="${INK}" stroke-width="4"/>
    <path d="M50 30 L37 44 M90 30 L103 44 M30 66 L17 80 M44 66 L55 80 M96 66 L85 80 M110 66 L123 80" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`;
  const RC_SPLIT = `<svg viewBox="0 0 140 110">${TREE_BOXES}</svg>`;
  const RC_MERGE = `<svg viewBox="0 0 140 110"><g transform="translate(0 106) scale(1 -1)">${TREE_BOXES}</g></svg>`;
  const RC_STOP = `<svg viewBox="0 0 140 110">
    <polygon points="70,4 80,30 108,30 86,47 94,74 70,58 46,74 54,47 32,30 60,30" fill="#ffc93c" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <rect x="44" y="78" width="52" height="28" rx="8" fill="#fff" stroke="${INK}" stroke-width="4"/>
    <text x="70" y="101" text-anchor="middle" font-family="Bungee, Impact" font-size="22" fill="${INK}">1</text></svg>`;

  const ROWS = [
    ['1', 'WHOLE TEAM', '1 group of 8'],
    [frac(1, 2), 'HALVES', '2 groups of 4'],
    [frac(1, 4), 'QUARTERS', '4 groups of 2'],
    [frac(1, 8), 'EIGHTHS', '8 groups of 1'],
  ];

  Deck.add({
    id: 'mergesort',
    title: 'Merge Sort',
    theme: 'theme-gym',
    steps: 2,
    build(root) {
      S.root = root;
      root.append(Deck.art('bg-gym.png', 'bg'), el('div', { class: 'qs-vignette' }));
      const L = el('div', { class: 'layer qs' });
      root.append(L);

      // chroma key for art that ships on flat magenta (harmless on transparent PNGs)
      L.append(el('div', { class: 'qs-defs', html: '<svg width="0" height="0" style="position:absolute"><filter id="qs-key" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" result="k" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -2.5 5 -2.5 0 5"/><feComposite in="k" in2="SourceAlpha" operator="in"/></filter></svg>' }));

      L.append(el('div', { class: 'qs-head' },
        el('div', { class: 'kicker', text: "Coach Halfway's" }),
        el('h1', { class: 'title qs-title', html: 'MERGE <span class="hl">SORT</span>' })));

      // gym scoreboard
      S.compEl = el('div', { class: 'qs-led', text: '00' });
      S.groupEl = el('div', { class: 'qs-led gold', text: '1' });
      L.append(el('div', { class: 'qs-board' },
        el('div', { class: 'qs-bcell' }, el('div', { class: 'qs-blabel', text: 'COMPARISONS' }), S.compEl),
        el('div', { class: 'qs-bcell' }, el('div', { class: 'qs-blabel', text: 'EACH GROUP' }), S.groupEl)));

      // controls
      S.playBtn = el('button', { class: 'btn small qs-play qs-hint', onclick: play }, el('i', { html: ICONS.play + ICONS.pause + ICONS.again }), el('span', { text: 'PLAY' }));
      const speeds = el('div', { class: 'qs-speed' }, el('div', { class: 'qs-speed-l', text: 'SPEED' }),
        ...[1, 2, 3].map(v => el('button', { class: 'qs-sp' + (v === 1 ? ' on' : ''), text: v + '×', onclick: e => {
          S.speed = v; speeds.querySelectorAll('.qs-sp').forEach(b => b.classList.toggle('on', b === e.currentTarget)); Sound.sfx('tick');
        } })));
      L.append(el('div', { class: 'qs-ctrls' },
        el('button', { class: 'btn small teal', onclick: () => shuffle(false) }, el('i', { html: ICONS.dice }), el('span', { text: 'SHUFFLE' })),
        S.playBtn,
        el('button', { class: 'btn small violet', onclick: stepBtn }, el('i', { html: ICONS.step }), el('span', { text: 'STEP' })),
        speeds));

      // tree panel with a fraction label for every row
      L.append(el('div', { class: 'qs-treebox' }, el('div', { class: 'qs-treetab', html: 'RECURSION TREE <small>split down, merge back up</small>' })));
      S.rowLabs = ROWS.map(([f, name, sub], d) => el('div', { class: 'ms-rowlab', style: { top: (TREE_TOP + d * ROW_H) + 'px' } },
        el('em', { html: f }), el('span', { html: `${name}<small>${sub}</small>` })));
      S.rowLabs.forEach((r, d) => r.style.setProperty('--c', DEPTH_COLORS[d]));
      L.append(...S.rowLabs);
      S.tree = el('div', { class: 'qs-tree' });
      L.append(S.tree);

      // floor zone, kids, fx
      S.zone = el('div', { class: 'qs-zone' });
      const kidsLayer = el('div', { class: 'qs-kids' });
      S.kids = [0, 1, 3, 4, 6, 7, 9, 10].map((li, i) => makeKid(LOOKS[li], i));
      S.kids.forEach(k => kidsLayer.append(k.node));
      S.fx = el('div', { class: 'qs-fx' });
      S.banner = el('div', { class: 'qs-banner', text: 'SORTED!' });
      L.append(S.zone, kidsLayer, S.banner, S.fx);

      // coach
      S.coachImg = Deck.art('coach-pivot.png', 'qs-coach', 'Coach Halfway');
      S.tweet = el('div', { class: 'qs-tweet', html: `<svg viewBox="0 0 200 120"><polygon points="100,4 118,30 152,14 146,46 194,50 154,70 178,104 132,92 112,118 96,92 54,112 64,80 8,74 50,54 22,22 70,32" fill="#fff" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/></svg><span>TWEET!</span>` });
      S.bubbleText = el('span');
      S.bubble = el('div', { class: 'bubble tail-down qs-bubble hidden-b' }, S.bubbleText);
      L.append(el('div', { class: 'qs-coachwrap' }, S.coachImg), S.tweet, S.bubble);

      // step 1: recap
      L.append(el('div', { class: 'qs-recap', 'data-at': 1 },
        el('div', { class: 'panel qs-rc-panel' },
          el('div', { class: 'kicker', text: 'Coach Halfway asks' }),
          el('h2', { class: 'title qs-rc-title', html: 'What just <span class="hl">happened?</span>' }),
          recapRow('d', RC_SPLIT, 'SPLIT', `Cut the team in <b>half</b>, then in half again: <b>${frac(1, 2)} → ${frac(1, 4)} → ${frac(1, 8)}</b>`),
          recapRow('s', RC_STOP, 'STOP', 'A group of <b>1</b> is already sorted. That\'s the stopping rule.'),
          recapRow('c', RC_MERGE, 'MERGE', 'Compare the two in front. The <b>smaller</b> one steps up. Every group does the <b>SAME</b> thing: <b class="rec">recursion!</b>'))));

      reset(false);
    },
    enter(step) {
      if (step === 0) later(() => { if (Deck.isActive('mergesort') && S.step === 0 && !S.playing && S.ei === 0) say('coach/intro'); }, 700);
      S.entered = true;
    },
    step(n) {
      S.step = n;
      Deck.reveal(S.root, n);
      if (n === 1) {
        S.playing = false; setPlayBtn();
        later(() => { if (Deck.isActive('mergesort')) { say('coach/recap'); Sound.sfx('sparkle'); } }, 350);
      }
    },
    leave() {
      stopAll();
      Sound.stopVoice();
      reset(false);
      S.bubble.classList.add('hidden-b');
      S.playBtn.classList.add('qs-hint');
    },
  });

  window.MS_LINES = LINES;
  window.MergeSlide = { S, stepOnce };
})();
