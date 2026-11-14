/* Finale: three carnival prize tickets flip over one build at a time, then a giant THANK YOU.
 * Step 0: title + three face-down tickets + characters peeking in.
 * Steps 1-3: flip ticket 1, 2, 3.
 * Step 4: THANK YOU! / You're computer scientists now! (confetti + fanfare + whistle)
 */
(function () {
  const { el } = Deck;
  const INK = '#1d1233';
  const LINES = {
    'coach/finale-thanks': "You're computer scientists now! Give yourselves a big cheer!",
  };
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };
  let root, tickets = [], cast, thanks, shown = 0;

  const frac = (n, d) => `<span class="big-frac fin-frac"><span>${n}</span><span>${d}</span></span>`;

  // icon 1: halving fraction strips (1/2, 1/4, 1/8)
  const ICON_DIVIDE = (() => {
    let s = '';
    [2, 4, 8].forEach((n, r) => {
      const y = 8 + r * 50, w = 240 / n;
      for (let i = 0; i < n; i++) {
        s += `<rect x="${10 + i * w}" y="${y}" width="${w}" height="38" rx="6" fill="${i === 0 ? '#ffc93c' : 'rgba(255,255,255,.18)'}" stroke="${INK}" stroke-width="4"/>`;
      }
      s += `<text x="${12 + w / 2 - 2}" y="${y + 27}" text-anchor="middle" font-family="Bungee, Impact" font-size="${r === 2 ? 0 : 20}" fill="${INK}">1/${n}</text>`;
    });
    return `<svg viewBox="0 0 260 160">${s}</svg>`;
  })();
  // icon 2: a pie in quarters with 3/4 filled
  const ICON_FRAC = (() => {
    const cx = 92, cy = 80, r = 68;
    const wedge = (a0, a1, fill) => {
      const p = a => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
      const [x0, y0] = p(a0), [x1, y1] = p(a1);
      return `<path d="M${cx} ${cy} L${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${fill}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
    };
    const q = Math.PI / 2;
    let s = '';
    for (let i = 0; i < 4; i++) s += wedge(-q + i * q, i * q, i < 3 ? (i % 2 ? '#ff4f5e' : '#ff6fb5') : 'rgba(255,255,255,.2)');
    s += `<g font-family="Bungee, Impact" fill="#fff" text-anchor="middle" stroke="${INK}" stroke-width="6" paint-order="stroke"><text x="212" y="66" font-size="46">3</text><text x="212" y="134" font-size="46">4</text></g><rect x="184" y="80" width="56" height="9" rx="4" fill="#fff" stroke="${INK}" stroke-width="4"/>`;
    return `<svg viewBox="0 0 260 160">${s}</svg>`;
  })();
  // icon 3: a Sierpinski triangle (level 3)
  const ICON_REC = (() => {
    let s = '';
    const tri = (x, y, size, d) => {
      if (d === 0) { const h = size * 0.866; s += `<polygon points="${x},${y} ${x + size / 2},${y - h} ${x + size},${y}" fill="#ffc93c" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`; return; }
      const h = size * 0.866, n = size / 2;
      tri(x, y, n, d - 1); tri(x + n, y, n, d - 1); tri(x + n / 2, y - h / 2, n, d - 1);
    };
    tri(50, 152, 160, 3);
    return `<svg viewBox="0 0 260 160">${s}</svg>`;
  })();

  const TICKETS = [
    { cls: 't1', icon: ICON_DIVIDE, title: 'DIVIDE &amp;<br>CONQUER', text: `Cut the problem in half, again and again!<div class="fin-chain">${frac(1, 2)}<i>→</i>${frac(1, 4)}<i>→</i>${frac(1, 8)}<i>…</i></div>`, no: '001' },
    { cls: 't2', icon: ICON_FRAC, title: 'FRACTIONS', text: 'Fractions help us <b>see</b> numbers, and compare them!', no: '002' },
    { cls: 't3', icon: ICON_REC, title: 'RECURSION', text: 'A rule that uses <b>itself</b>, plus a <b>stopping rule</b>.', no: '003' },
  ];

  function ticket(t, i) {
    const back = el('div', { class: 'fin-face fin-back' },
      el('div', { class: 'fin-q', text: '?' }),
      el('div', { class: 'fin-back-label', text: 'PRIZE' }),
      el('div', { class: 'fin-stub', html: `<span>ADMIT ONE</span><span>No. ${t.no}</span>` }));
    const front = el('div', { class: 'fin-face fin-front' },
      el('div', { class: 'fin-icon', html: t.icon }),
      el('div', { class: 'fin-ttl', html: t.title }),
      el('div', { class: 'fin-txt', html: t.text }),
      el('div', { class: 'fin-stub', html: `<span>★ PRIZE ★</span><span>No. ${t.no}</span>` }),
      el('div', { class: 'fin-stamp', text: 'EARNED!' }));
    const card = el('div', { class: 'fin-card' }, back, front);
    return el('div', { class: `fin-ticket ${t.cls}`, style: { '--i': i } }, card);
  }

  Deck.add({
    id: 'finale', music: 'finale',
    title: 'You Did It!',
    theme: 'theme-carnival',
    steps: 5,
    build(r) {
      root = r;
      root.append(Deck.art('bg-carnival.png', 'bg'), el('div', { class: 'fin-vignette' }));
      const L = el('div', { class: 'layer fin' });
      root.append(L);
      L.append(el('div', { html: '<svg width="0" height="0" style="position:absolute"><filter id="fin-key" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" result="k" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -2.5 5 -2.5 0 5"/><feComposite in="k" in2="SourceAlpha" operator="in"/></filter></svg>' }));

      L.append(el('div', { class: 'fin-head' },
        el('div', { class: 'kicker', text: 'Code Camp complete' }),
        el('h1', { class: 'title fin-title', html: 'YOU <span class="hl">DID IT!</span>' })));

      // the cast peeks in from the bottom corners
      cast = el('div', { class: 'fin-cast' },
        ...[['halvini-triumph.png', 'c1', 'Madame Halvina'], ['ledger-delighted.png', 'c2', 'The accountant'],
          ['hero-5.png', 'c3', 'The knight'], ['coach-pivot.png', 'c4', 'Coach Halfway']].map(([img, c, alt], i) =>
          el('div', { class: 'fin-peek ' + c, style: { '--i': i } }, Deck.art(img, 'fin-char', alt))));
      L.append(cast);

      const row = el('div', { class: 'fin-row' });
      tickets = TICKETS.map((t, i) => ticket(t, i));
      row.append(...tickets);
      L.append(row);

      thanks = el('div', { class: 'fin-thanks' },
        el('div', { class: 'fin-rays' }),
        el('div', { class: 'fin-ty', text: 'THANK YOU!' }),
        el('div', { class: 'fin-sub', html: "You're <b>computer scientists</b> now!" }));
      L.append(thanks);
    },
    enter() {
      cast.classList.remove('in'); void cast.offsetWidth; cast.classList.add('in');
    },
    step(n, dir) {
      tickets.forEach((t, i) => {
        const on = n >= i + 1;
        const was = t.classList.contains('flipped');
        t.classList.toggle('flipped', on);
        if (on && !was && dir > 0 && n === i + 1) {
          Sound.sfx('whoosh');
          later(() => Sound.sfx('sparkle'), 300);
          later(() => Sound.sfx('thud'), 950);
        }
      });
      const ty = n >= 4;
      thanks.classList.toggle('on', ty);
      cast.classList.toggle('cheer', ty);
      root.classList.toggle('fin-final', ty);
      if (ty && dir > 0 && shown !== 4) {
        Sound.sfx('fanfare');
        window.CoachFX && CoachFX.whistle();
        Deck.confetti(root, 180);
        later(() => Deck.confetti(root, 120), 1400);
        later(() => Deck.confetti(root, 120), 2900);
        later(() => Sound.voice('coach/finale-thanks'), 900);
      }
      shown = n;
    },
    leave() {
      timers.forEach(clearTimeout); timers.clear();
      shown = 0;
    },
  });

  window.FINALE_LINES = LINES;
})();
