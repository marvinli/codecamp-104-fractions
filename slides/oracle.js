/* Slide 1: Madame Halvina, the fortune-telling automaton who guesses your number with binary search.
   Each game's guesses are kept in window.OracleLog so the explainer slide can replay them. */
(function () {
  const { el, art, sleep, bump } = Deck;
  const MAX = 1000, MAX_GUESSES = 10;

  // Voice clips exist for the guesses of the first five levels (500, 250, 750, ...); deeper guesses use a generic line.
  const SPOKEN = new Set();
  (function walk(lo, hi, d) { if (lo > hi || d > 5) return; const m = Math.floor((lo + hi) / 2); SPOKEN.add(m); walk(lo, m - 1, d + 1); walk(m + 1, hi, d + 1); })(1, MAX, 1);

  const LINES = {
    intro: 'Think of a secret number from one to one thousand. Write it down. Do NOT tell me!',
    ready: 'Silence! Madame Halvina is reading your mind...',
    think: ['Hmmmmm...', 'The crystal ball is cloudy...', 'The spirits are whispering...', 'Ooooh, I sense something...'],
    less: ['Less? I knew that. I was testing you.', 'Lower, you say? Half the numbers: GONE!', 'Smaller! The top half vanishes!', 'Less! Farewell, big numbers!'],
    greater: ['Greater? Naturally. I was just warming up.', 'Higher! Away with the bottom half!', 'Bigger! Half the numbers: poof!', 'Greater! Goodbye, small numbers!'],
    win: ['I KNEW IT! Madame Halvina is never wrong!', 'Behold! Your number is revealed!', 'Ha HA! The crystal ball never lies!'],
    lie: 'You LIED to Madame Halvina! Your answers do not add up!',
    deep: ['Then it must be... THIS!', 'Is it... this one?', 'My ball says... this!'],
  };
  const pick = a => a[Math.floor(Math.random() * a.length)];

  let root, img, imgs = {}, bubble, ticker, reels, btnLess, btnYes, btnMore, startBtn, againBtn,
    orbs, logList, thermo, keep, cutLo, cutHi, marker, countEl, fracEl, fracNote, lineLo, lineHi;
  let lo, hi, guess, n, token = 0, busy = false;

  function pose(name) {
    Object.entries(imgs).forEach(([k, im]) => im.classList.toggle('on', k === name));
    bump(img, 'squash');
  }

  function say(text, voiceKey) {
    bubble.textContent = '';
    bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
    const t = ++sayTok;
    let i = 0;
    (function type() {
      if (t !== sayTok) return;
      bubble.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(type, 22);
    })();
    if (voiceKey) voiceEl = Sound.voice(voiceKey);
  }
  let sayTok = 0, voiceEl = null;
  /* Resolves once her current line has finished (never cut a line off), or when the game resets. */
  function voiceDone(t) {
    const t0 = performance.now();
    return new Promise(res => (function check() {
      const a = voiceEl, talking = a && !a.paused && !a.ended && !a.error && !Sound.muted;
      if (!talking || t !== token || performance.now() - t0 > 9000) res(); else setTimeout(check, 80);
    })());
  }
  /* Say a line from LINES once the previous one is done. Returns false if the game was reset meanwhile. */
  async function speak(group, t) {
    await voiceDone(t);
    if (t !== token) return false;
    sayLine(group);
    return true;
  }
  function sayLine(group) {
    const list = LINES[group];
    if (Array.isArray(list)) { const i = Math.floor(Math.random() * list.length); say(list[i], `halvina/${group}-${i + 1}`); }
    else say(list, `halvina/${group}`);
  }

  function setButtons(on) { [btnLess, btnYes, btnMore].forEach(b => b.disabled = !on); }

  /* Slot-machine digits */
  function showNumber(num, spin = true) {
    const s = String(num).padStart(4, ' ');
    reels.forEach((r, i) => {
      const ch = s[i];
      r.classList.toggle('blank', ch === ' ');
      if (!spin) { r.firstChild.textContent = ch === ' ' ? '' : ch; return; }
      r.classList.add('spin');
      setTimeout(() => { r.classList.remove('spin'); r.firstChild.textContent = ch === ' ' ? '' : ch; bump(r, 'land'); Sound.sfx('tick'); }, 350 + i * 170);
    });
  }

  function paintRange(animateCut) {
    const y = v => (1 - (v - 1) / (MAX - 1)) * 100; // percent from top: 1000 at top
    const top = y(Math.max(lo, Math.min(hi, MAX))), bottom = y(Math.min(lo, hi));
    keep.style.top = top + '%';
    keep.style.height = Math.max(0.6, bottom - top) + '%';
    cutHi.style.height = top + '%';
    cutLo.style.top = bottom + '%';
    cutLo.style.height = (100 - bottom) + '%';
    lineHi.textContent = Deck.fmt(Math.max(lo, hi));
    lineLo.textContent = Deck.fmt(lo);
    lineHi.style.top = top + '%';
    lineLo.style.top = bottom + '%';
    const left = Math.max(0, hi - lo + 1);
    countEl.textContent = Deck.fmt(left);
    countEl.nextSibling.textContent = left === 1 ? 'number' : 'numbers';
    lineLo.style.visibility = lo >= hi ? 'hidden' : 'visible';
    const k = n;
    fracEl.innerHTML = k === 0 ? '<span class="whole">ALL</span>' : `<span class="big-frac"><span>1</span><span>${Deck.fmt(2 ** k)}</span></span>`;
    fracNote.textContent = k === 0 ? 'of the numbers' : 'of the numbers left (about)';
    if (animateCut) bump(thermo, 'chopped');
  }

  function paintOrbs() {
    orbs.forEach((o, i) => { o.classList.toggle('used', i < n); o.classList.toggle('now', i === n - 1); });
  }

  function addLog(g, ans) {
    const sym = ans === 'less' ? '▼ less than' : ans === 'greater' ? '▲ greater than' : '★ YES!';
    const row = el('li', { class: 'ticket ' + ans },
      el('span', { class: 'tn' }, '#' + n), el('span', { class: 'tg' }, Deck.fmt(g)), el('span', { class: 'ta' }, sym));
    logList.append(row);
    logList.scrollTop = 1e6;
  }

  function reset() {
    token++; busy = false;
    lo = 1; hi = MAX; n = 0; guess = null;
    window.OracleLog = [];
    logList.innerHTML = '';
    paintRange(); paintOrbs();
    pose('idle');
    ticker.classList.remove('win', 'lie');
    ticker.querySelector('.ask').textContent = 'PICK A NUMBER';
    reels.forEach(r => { r.classList.add('blank'); r.firstChild.textContent = '?'; });
    setButtons(false);
    startBtn.hidden = false; againBtn.hidden = true;
    root.classList.remove('playing', 'won', 'lied');
    say(LINES.intro);
  }

  async function nextGuess() {
    const t = token;
    busy = true; setButtons(false);
    if (lo > hi) return caughtLying();
    guess = Math.floor((lo + hi) / 2);
    n++;
    paintOrbs();
    pose('think');
    ticker.querySelector('.ask').textContent = 'THINKING…';
    Sound.sfx('drum');
    reels.forEach(r => { r.classList.remove('blank'); r.classList.add('spin'); });
    if (n === 1) await speak('ready', t); else if (Math.random() < .55) await speak('think', t);
    await sleep(n === 1 ? 2200 : 1300);
    await voiceDone(t);
    if (t !== token) return;
    pose('idle');
    ticker.querySelector('.ask').textContent = 'IS IT…';
    showNumber(guess);
    await sleep(1050);
    await voiceDone(t);
    if (t !== token) return;
    Sound.sfx('ding');
    const lineKey = SPOKEN.has(guess) ? `halvina/num-${guess}` : `halvina/deep-${1 + Math.floor(Math.random() * LINES.deep.length)}`;
    say(`Is it ${Deck.fmt(guess)}?`, lineKey);
    ticker.querySelector('.ask').textContent = 'IS IT…';
    window.OracleLog.push({ lo, hi, guess, answer: null });
    busy = false; setButtons(true);
  }

  async function answer(ans) {
    if (busy || guess == null) return;
    const t = token;
    busy = true; setButtons(false);
    window.OracleLog[window.OracleLog.length - 1].answer = ans;
    addLog(guess, ans);
    if (ans === 'yes') return win();
    if (ans === 'less') hi = guess - 1; else lo = guess + 1;
    Sound.sfx('chop');
    paintRange(true);
    pose('chop');
    if (!await speak(ans, t)) return;
    await sleep(1700);
    if (t !== token) return;
    if (lo > hi || n >= MAX_GUESSES && lo !== hi) { await voiceDone(t); if (t !== token) return; return caughtLying(); }
    nextGuess();
  }

  async function win() {
    lo = hi = guess; paintRange();
    fracEl.innerHTML = '<span class="whole">★</span>';
    fracNote.textContent = 'FOUND IT!';
    pose('triumph');
    ticker.classList.add('win');
    ticker.querySelector('.ask').textContent = `FOUND IN ${n}!`;
    root.classList.add('won');
    Sound.sfx('fanfare');
    Deck.confetti(root, 160);
    const t = token;
    speak('win', t).then(ok => ok && setTimeout(() => { if (Deck.isActive('oracle') && t === token) say(`Found it in just ${n} guess${n > 1 ? 'es' : ''}!`); }, 2600));
    startBtn.hidden = true; againBtn.hidden = false;
  }

  function caughtLying() {
    pose('suspicious');
    root.classList.add('lied');
    ticker.classList.add('lie');
    ticker.querySelector('.ask').textContent = 'LIAR DETECTED';
    reels.forEach(r => { r.classList.remove('spin'); r.classList.remove('blank'); r.firstChild.textContent = '!'; });
    Sound.sfx('buzz');
    bump(root.querySelector('.cabinet'), 'anim-shake');
    sayLine('lie');
    startBtn.hidden = true; againBtn.hidden = false;
  }

  function build(r) {
    root = r;
    r.append(art('bg-carnival.png', 'bg'));
    // drifting sparkles over the background
    const motes = el('div', { class: 'motes' });
    for (let i = 0; i < 28; i++) motes.append(el('i', { style: { left: Math.random() * 100 + '%', animationDelay: -Math.random() * 12 + 's', animationDuration: 8 + Math.random() * 8 + 's' } }));
    r.append(motes);

    // ---------- the cabinet ----------
    const bulbs = el('div', { class: 'bulbs' });
    for (let i = 0; i < 26; i++) bulbs.append(el('i', { style: { '--i': i } }));

    img = el('div', { class: 'halvina' });
    for (const p of ['idle', 'think', 'triumph', 'suspicious', 'chop']) { imgs[p] = art(`halvini-${p}.png`, 'pose'); img.append(imgs[p]); }

    reels = [0, 1, 2, 3].map(() => el('div', { class: 'reel blank' }, el('span', null, '?')));
    ticker = el('div', { class: 'ticker' }, el('div', { class: 'ask' }, 'PICK A NUMBER'), el('div', { class: 'reels' }, reels));

    btnLess = el('button', { class: 'btn red answer', onclick: () => answer('less') }, el('span', { class: 'arr' }, '▼'), 'LESS THAN');
    btnYes = el('button', { class: 'btn answer yes', onclick: () => answer('yes') }, 'YES!');
    btnMore = el('button', { class: 'btn teal answer', onclick: () => answer('greater') }, 'GREATER THAN', el('span', { class: 'arr' }, '▲'));
    startBtn = el('button', { class: 'btn violet start', onclick: () => { startBtn.hidden = true; root.classList.add('playing'); nextGuess(); } }, "I'VE GOT MY NUMBER!");
    againBtn = el('button', { class: 'btn violet start', hidden: true, onclick: reset }, '↻ PLAY AGAIN');

    const cabinet = el('div', { class: 'cabinet' },
      el('div', { class: 'crown' },
        el('div', { class: 'sign' }, el('div', { class: 'sign-top' }, 'MADAME'), el('div', { class: 'sign-name' }, 'HALVINA')),
        el('div', { class: 'sign-sub' }, '★ SEES ALL ★ KNOWS ALL ★ NEEDS ONLY 10 GUESSES ★')),
      el('div', { class: 'window' }, bulbs, el('div', { class: 'curtain l' }), el('div', { class: 'curtain r' }), img, el('div', { class: 'glass' })),
      el('div', { class: 'counter' }, ticker,
        el('div', { class: 'answers' }, btnLess, btnYes, btnMore, startBtn, againBtn)),
    );
    r.append(cabinet);

    bubble = el('div', { class: 'bubble tail-left halvina-bubble' });
    r.append(bubble);

    // ---------- left: the range of numbers still possible ----------
    keep = el('div', { class: 'keep' });
    cutLo = el('div', { class: 'cut lo' }); cutHi = el('div', { class: 'cut hi' });
    lineHi = el('div', { class: 'edge hi' }); lineLo = el('div', { class: 'edge lo' });
    thermo = el('div', { class: 'thermo' }, cutHi, keep, cutLo, lineHi, lineLo,
      ...[1, 250, 500, 750, 1000].map(v => el('div', { class: 'tick', style: { top: (1 - (v - 1) / (MAX - 1)) * 100 + '%' } }, Deck.fmt(v))));
    countEl = el('div', { class: 'count' }); fracEl = el('div', { class: 'frac' }); fracNote = el('div', { class: 'frac-note' });
    r.append(el('div', { class: 'panel side left-side' },
      el('div', { class: 'side-title' }, 'Still possible'),
      el('div', { class: 'range-wrap' }, thermo,
        el('div', { class: 'range-stats' }, countEl, el('div', { class: 'count-lbl' }, 'numbers'), el('div', { class: 'split' }), fracEl, fracNote))));

    // ---------- right: guesses used + log ----------
    orbs = Array.from({ length: MAX_GUESSES }, () => el('i', { class: 'orb' }));
    logList = el('ol', { class: 'log' });
    r.append(el('div', { class: 'panel side right-side' },
      el('div', { class: 'side-title' }, 'Guesses'),
      el('div', { class: 'orbs' }, orbs),
      logList,
      el('button', { class: 'btn small reset', onclick: reset }, '↻ Reset')));

    // Presenter shortcuts: ↓ less, ↑ greater, Enter yes / start / play again
    document.addEventListener('keydown', e => {
      if (!Deck.isActive('oracle') || e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowDown' && !btnLess.disabled) { e.preventDefault(); answer('less'); }
      else if (e.key === 'ArrowUp' && !btnMore.disabled) { e.preventDefault(); answer('greater'); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (!btnYes.disabled && root.classList.contains('playing') && !root.classList.contains('won')) answer('yes');
        else if (!startBtn.hidden) startBtn.click();
        else if (!againBtn.hidden) againBtn.click();
      }
    });
    reset();
  }

  Deck.add({
    id: 'oracle', music: 'carnival', title: 'Madame Halvina', theme: 'theme-oracle',
    build,
    enter() { if (!root.classList.contains('playing')) sayLine('intro'); },
    leave() { Sound.stopVoice(); },
  });

  window.HalvinaLines = LINES; window.HalvinaSpoken = SPOKEN; // used by tools/voices to render clips
})();
