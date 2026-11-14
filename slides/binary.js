/* Slides 2-4: how Madame Halvina did it (binary search), divide & conquer, and binary search at cosmic scale. */
(function () {
  const { el, art, sleep, bump, fmt, reveal } = Deck;
  const MAX = 1000;

  /* ===================================================================================
     Slide: Halvina's secret. Replays the class's last game (or a demo) one guess per build.
     =================================================================================== */
  (function () {
    let root, rows, line, keepTop, guessPin, headline, game, built = false, sub;
    const X0 = 0, LINE_W = 1500;
    const xOf = v => ((v - 1) / (MAX - 1)) * LINE_W;

    function demoGame(secret) {
      const log = []; let lo = 1, hi = MAX;
      for (;;) {
        const g = Math.floor((lo + hi) / 2);
        const a = g === secret ? 'yes' : secret < g ? 'less' : 'greater';
        log.push({ lo, hi, guess: g, answer: a });
        if (a === 'yes') break;
        if (a === 'less') hi = g - 1; else lo = g + 1;
      }
      return log;
    }

    function loadGame() {
      const log = (window.OracleLog || []).filter(r => r.answer);
      const ok = log.length && log[log.length - 1].answer === 'yes';
      return ok ? { log, demo: false, secret: log[log.length - 1].guess } : { log: demoGame(737), demo: true, secret: 737 };
    }

    function rangeAfter(i) { // the range still possible after answer i (i = -1 → everything)
      if (i < 0) return [1, MAX];
      const r = game.log[i];
      if (r.answer === 'yes') return [r.guess, r.guess];
      return r.answer === 'less' ? [r.lo, r.guess - 1] : [r.guess + 1, r.hi];
    }

    function buildRows() {
      rows.innerHTML = '';
      game.log.forEach((r, i) => {
        const [a, b] = rangeAfter(i);
        const left = b - a + 1;
        const frac = r.answer === 'yes' ? '<b class="found">FOUND IT!</b>' : `about <span class="big-frac sm"><span>1</span><span>${2 ** (i + 1)}</span></span> left`;
        const ans = r.answer === 'yes' ? '★ YES!' : r.answer === 'less' ? '▼ less' : '▲ greater';
        rows.append(el('div', { class: 'brow hidden ' + r.answer, 'data-i': i },
          el('div', { class: 'bq' }, el('span', { class: 'bn' }, `Guess ${i + 1}`), el('span', { class: 'bgv' }, fmt(r.guess)), el('span', { class: 'ba' }, ans)),
          el('div', { class: 'btrack' },
            el('div', { class: 'bkeep', style: { left: xOf(a) / LINE_W * 100 + '%', width: Math.max(.4, (xOf(b) - xOf(a)) / LINE_W * 100) + '%' } }),
            el('div', { class: 'bpin', style: { left: xOf(r.guess) / LINE_W * 100 + '%' } })),
          el('div', { class: 'bf', html: `<span class="bleft">${fmt(left)}</span> ${frac}` })));
      });
    }

    function show(step) {
      // step 0 = the whole line; step k = after guess k
      const k = Math.min(step, game.log.length);
      [...rows.children].forEach((r, i) => r.classList.toggle('hidden', i >= k));
      const [a, b] = rangeAfter(k - 1);
      keepTop.style.left = xOf(a) + 'px';
      keepTop.style.width = Math.max(6, xOf(b) - xOf(a)) + 'px';
      if (k === 0) {
        guessPin.style.opacity = 0;
        headline.innerHTML = `${fmt(MAX)} numbers. Where should the first guess go?`;
      } else {
        const r = game.log[k - 1];
        guessPin.style.opacity = 1;
        guessPin.style.left = xOf(r.guess) + 'px';
        guessPin.querySelector('b').textContent = fmt(r.guess);
        headline.innerHTML = r.answer === 'yes'
          ? `Found <b>${fmt(r.guess)}</b> in just <b>${k}</b> guesses!`
          : `Guess the <b>middle</b>: ${fmt(r.guess)}. “${r.answer === 'less' ? 'Less than' : 'Greater than'}!” → throw away <b>half</b>!`;
      }
    }

    Deck.add({
      id: 'bs-how', music: 'carnival', title: "Halvina's Secret", theme: 'theme-bs',
      steps: 11,
      prepare() {
        game = loadGame();
        this.steps = game.log.length + 1;
        if (built) { buildRows(); sub.textContent = game.demo ? 'Replaying a game where the secret number was 737' : `Replaying YOUR game: the secret number was ${fmt(game.secret)}`; }
      },
      build(r) {
        root = r; built = true;
        if (!game) game = loadGame();
        r.append(el('div', { class: 'bs-head' },
          el('div', { class: 'kicker' }, "Madame Halvina's secret"),
          el('h1', { class: 'title' }, 'Binary ', el('span', { class: 'hl' }, 'Search')),
          sub = el('div', { class: 'bs-sub' })));
        keepTop = el('div', { class: 'keep-top' });
        guessPin = el('div', { class: 'gpin' }, el('b'), el('i'));
        line = el('div', { class: 'numline' },
          el('div', { class: 'nl-track' }), keepTop, guessPin,
          ...[1, 250, 500, 750, 1000].map(v => el('div', { class: 'nl-tick', style: { left: xOf(v) + 'px' } }, fmt(v))));
        headline = el('div', { class: 'bs-line' });
        rows = el('div', { class: 'brows' });
        r.append(line, headline, rows);
        r.append(art('halvini-chop.png', 'bs-chop'));
        buildRows();
        sub.textContent = game.demo ? 'Replaying a game where the secret number was 737' : `Replaying YOUR game: the secret number was ${fmt(game.secret)}`;
      },
      step(n, dir) {
        show(n);
        if (dir > 0 && n > 0) {
          const r = game.log[n - 1];
          if (r.answer === 'yes') { Sound.sfx('fanfare'); Deck.confetti(root, 80); } else Sound.sfx('chop');
          bump(root.querySelector('.bs-chop'), 'swing');
        }
      },
    });
  })();

  /* ===================================================================================
     Slide: divide & conquer. A bar gets chopped in half ten times.
     =================================================================================== */
  (function () {
    let root, chopBox, chain, timer, eq;
    const CHOPS = 10;

    function renderChain(k) {
      chain.innerHTML = '';
      for (let i = 0; i <= k; i++) {
        chain.append(el('div', { class: 'link' + (i === k ? ' now' : '') },
          i === 0 ? el('span', { class: 'one' }, '1') : el('span', { class: 'big-frac' }, el('span', null, '1'), el('span', null, fmt(2 ** i)))));
        if (i < k) chain.append(el('div', { class: 'arrow' }, '×½'));
      }
    }

    async function runChops() {
      clearTimeout(timer);
      const t = Symbol(); runChops.t = t;
      chopBox.innerHTML = '';
      const W = 1500, H = 150;
      let w = W;
      const bar = el('div', { class: 'cbar', style: { width: w + 'px', height: H + 'px' } }, el('span', null, '1,000 numbers'));
      const tag = el('div', { class: 'ctag' });
      chopBox.append(bar, tag);
      const place = (w, txt) => { tag.style.left = (w + 24) + 'px'; tag.textContent = txt; };
      place(w, '');
      renderChain(0);
      await sleep(900);
      for (let i = 1; i <= CHOPS; i++) {
        if (runChops.t !== t) return;
        // the slash
        const slash = el('div', { class: 'slash', style: { left: w / 2 + 'px' } });
        chopBox.append(slash);
        Sound.sfx('chop');
        await sleep(220);
        // the discarded half falls away
        const gone = el('div', { class: 'cbar gone', style: { width: w / 2 + 'px', height: H + 'px', left: w / 2 + 'px' } });
        chopBox.append(gone);
        gone.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${60 + Math.random() * 80}px, 520px) rotate(${10 + Math.random() * 25}deg)`, opacity: 0 }],
          { duration: 900, easing: 'cubic-bezier(.5,0,.8,.6)', fill: 'forwards' }).onfinish = () => gone.remove();
        w /= 2;
        bar.style.width = w + 'px';
        const left = Math.ceil(1000 / 2 ** i);
        bar.firstChild.textContent = i < 3 ? `${fmt(left)} numbers` : '';
        place(w, i < 3 ? '' : i < CHOPS ? `← ${fmt(left)} numbers left` : '← just 1 number left!');
        slash.remove();
        renderChain(i);
        await sleep(i < 4 ? 900 : 650);
      }
      if (runChops.t !== t) return;
      bar.classList.add('final');
      bar.firstChild.textContent = '';
      Sound.sfx('ding');
    }

    Deck.add({
      id: 'divide-conquer', music: 'carnival', title: 'Divide & Conquer', theme: 'theme-bs dc',
      steps: 4,
      build(r) {
        root = r;
        r.append(el('div', { class: 'dc-hero', 'data-at': 0 },
          el('div', { class: 'kicker' }, 'A computer science super-strategy'),
          el('h1', { class: 'title giant' }, 'Divide', el('br'), el('span', { class: 'hl' }, '& Conquer'))));
        r.append(art('halvini-chop.png', 'dc-halvina'));
        r.append(el('div', { class: 'dc-recipe', 'data-at': 1 },
          ...[['1', 'Big problem', '🧩'], ['2', 'Cut it in half', '🔪'], ['3', 'Keep the half that matters', '👉'], ['4', 'Repeat!', '🔁']]
            .map(([n, t, e], i) => el('div', { class: 'card', style: { animationDelay: i * .12 + 's' } }, el('div', { class: 'cn' }, n), el('div', { class: 'ce' }, e), el('div', { class: 'ct' }, t)))));
        chopBox = el('div', { class: 'chopbox' });
        chain = el('div', { class: 'chain' });
        r.append(el('div', { class: 'dc-chops', 'data-at': 2 }, chopBox, chain));
        eq = el('div', { class: 'dc-eq', 'data-at': 3, html:
          `Every guess throws away <b>½</b> of what's left.<br>
           <span class="eqline"><span class="big-frac"><span>1</span><span>2</span></span> × <span class="big-frac"><span>1</span><span>2</span></span> × <span class="big-frac"><span>1</span><span>2</span></span> × … <small>(10 times)</small> = <span class="big-frac gold"><span>1</span><span>1,024</span></span></span>
           <br><span class="tag">That's why 10 guesses is enough for 1,000 numbers!</span>` });
        r.append(eq);
      },
      step(n) {
        reveal(root, n);
        root.dataset.step = n;
        if (n >= 2 && !runChops.t) runChops();
        if (n < 2) { runChops.t = null; }
      },
      leave() { runChops.t = null; },
    });
  })();

  /* ===================================================================================
     Slide: how big can binary search go?
     =================================================================================== */
  (function () {
    const ROWS = [
      { icon: '👧', what: 'Every girl in our class', n: 18, show: '18' },
      { icon: '🎟️', what: 'Halvina’s numbers', n: 1000, show: '1,000' },
      { icon: '🏟️', what: 'A million', n: 1e6, show: '1,000,000' },
      { icon: '🌍', what: 'Every person on Earth', n: 8.1e9, show: '8,100,000,000' },
      { icon: '⏳', what: 'Every second since the universe began', n: 4.35e17, show: '435,000,000,000,000,000', star: true },
      { icon: '⚛️', what: 'Every atom in the whole universe', n: 1e80, show: '1 with 80 zeros after it!' },
    ];
    const guesses = n => Math.ceil(Math.log2(n + 1));
    let root, rowEls = [], counters = [];

    function animateCount(node, target, ms = 1100) {
      const t0 = performance.now();
      (function tick(now) {
        const t = Math.min(1, (now - t0) / ms);
        node.textContent = Math.round(target * Deck.ease(t));
        if (t < 1) requestAnimationFrame(tick); else bump(node, 'land');
      })(t0);
    }

    Deck.add({
      id: 'universe', music: 'space', title: 'How Big Can We Go?', theme: 'theme-space',
      steps: ROWS.length + 2,
      build(r) {
        root = r;
        r.append(art('bg-space.png', 'bg'));
        r.append(el('div', { class: 'uv-head' },
          el('h1', { class: 'title' }, 'How many guesses to find ', el('span', { class: 'hl' }, 'ONE'), ' secret…'),
          el('div', { class: 'uv-q', 'data-at': 0 }, 'Guess before we reveal it! 🤔')));
        const table = el('div', { class: 'uv-table' });
        ROWS.forEach((row, i) => {
          const g = guesses(row.n);
          const num = el('b', { class: 'g' }, '0');
          counters.push(num);
          const dots = el('div', { class: 'gdots' });
          const shown = Math.min(g, 66);
          for (let d = 0; d < shown; d++) dots.append(el('i', { style: { animationDelay: d * (900 / shown) + 'ms' } }));
          if (g > shown) dots.append(el('span', { class: 'more' }, `+${g - shown} more`));
          const rowEl = el('div', { class: 'uv-row' + (row.star ? ' star' : ''), 'data-at': i + 1 },
            el('div', { class: 'ui' }, row.icon),
            el('div', { class: 'uw' }, el('div', { class: 'what' }, row.what), el('div', { class: 'how' }, row.show)),
            dots,
            el('div', { class: 'uc' }, num, el('span', null, 'guesses')));
          rowEls.push(rowEl);
          table.append(rowEl);
        });
        r.append(table);
        r.append(el('div', { class: 'uv-final', 'data-at': ROWS.length + 1 },
          el('div', { class: 'q' }, 'Find one special second in the whole life of the universe…'),
          el('div', { class: 'vs' },
            el('div', { class: 'vside slow' }, el('div', { class: 'who' }, '🐢 One at a time'), el('div', { class: 'res' }, '13.8 BILLION years'), el('div', { class: 'note' }, 'at 1 guess per second')),
            el('div', { class: 'vsx' }, 'VS'),
            el('div', { class: 'vside fast' }, el('div', { class: 'who' }, '🔮 Cut in half'), el('div', { class: 'res' }, '59 guesses'), el('div', { class: 'note' }, 'less than one minute!')))));
      },
      step(n, dir) {
        reveal(root, n);
        root.classList.toggle('final', n === ROWS.length + 1);
        rowEls.forEach((re, i) => re.classList.toggle('dim', n === ROWS.length + 1 && !ROWS[i].star));
        const i = n - 1;
        if (i >= 0 && i < ROWS.length && dir > 0) {
          const big = ROWS[i].star;
          if (big) Sound.sfx('drum');
          setTimeout(() => { animateCount(counters[i], guesses(ROWS[i].n), big ? 1600 : 900); }, big ? 900 : 200);
          setTimeout(() => Sound.sfx(big ? 'fanfare' : 'coin'), big ? 2500 : 1100);
        }
        counters.forEach((c, j) => { if (j < i || (dir < 0 && j <= i)) c.textContent = guesses(ROWS[j].n); if (j > i) c.textContent = '0'; });
        if (n === ROWS.length + 1 && dir > 0) { Sound.sfx('fanfare'); }
      },
    });
  })();
})();
