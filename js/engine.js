/* Deck engine: a fixed 1920x1080 stage scaled to the window, slides with "builds" (steps).
 *
 * A slide registers itself with Deck.add({...}):
 *   id         unique string
 *   title      shown in the dot tooltip
 *   theme      class added to the slide <section> (e.g. 'theme-carnival')
 *   steps      number of builds; Next/Prev walk through steps before changing slide (default 1 = no builds)
 *   prepare(dir)       optional; called before enter, may change this.steps (e.g. from data)
 *   build(root)        called once, lazily, before the slide is first shown. root = <section class="slide">
 *   enter(step, dir)   called every time the slide becomes active (dir = +1 forward, -1 backward)
 *   step(n, dir)       called whenever the build index changes while active (including right after enter)
 *   leave()            called when the slide stops being active: stop timers/animations here
 *
 * Keyboard: → / PageDown / Space = next, ← / PageUp = prev, M = mute, F = fullscreen, Home/End.
 * Keys are ignored while typing in an input.
 */
(function () {
  const W = 1920, H = 1080;
  const slides = [];
  let cur = -1, stepIdx = 0, scale = 1;

  const $ = (sel, root = document) => root.querySelector(sel);

  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'style' && typeof v === 'object') for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? n.style.setProperty(sk, sv) : (n.style[sk] = sv);
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid.nodeType ? kid : document.createTextNode(kid));
    return n;
  }

  function svg(tag, attrs, ...kids) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
    for (const kid of kids.flat()) if (kid) n.append(kid);
    return n;
  }

  /* An <img> for assets/img/<name>. While the file is missing (art still being made) it shows a
     placeholder so the deck never looks broken. */
  function art(name, cls = '', alt = '') {
    const img = el('img', { class: 'art ' + cls, alt, draggable: 'false', src: 'assets/img/' + name });
    img.addEventListener('error', () => {
      img.classList.add('art-missing');
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    }, { once: true });
    return img;
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => 1 - Math.pow(1 - t, 3);

  /* tween(ms, t => ...) → promise. Cancels nothing; callers guard with tokens if needed. */
  function tween(ms, fn, easing = ease) {
    return new Promise(res => {
      const t0 = performance.now();
      const tick = now => {
        const t = clamp((now - t0) / ms, 0, 1);
        fn(easing(t));
        t < 1 ? requestAnimationFrame(tick) : res();
      };
      requestAnimationFrame(tick);
    });
  }

  /* Re-trigger a CSS animation class. */
  function bump(node, cls) {
    node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls);
  }

  function fmt(n) { return Number(n).toLocaleString('en-US'); }

  function fit() {
    const vw = window.innerWidth, vh = window.innerHeight;
    scale = Math.min(vw / W, vh / H);
    const stage = $('#stage');
    stage.style.transform = `translate(${(vw - W * scale) / 2}px, ${(vh - H * scale) / 2}px) scale(${scale})`;
  }

  function add(def) { slides.push(Object.assign({ steps: 1 }, def)); }

  function ensureBuilt(s) {
    if (s.root) return;
    s.root = el('section', { class: 'slide ' + (s.theme || ''), 'data-id': s.id });
    $('#slides').append(s.root);
    try { s.build && s.build(s.root); } catch (e) { console.error('build failed:', s.id, e); }
  }

  function renderDots() {
    const dots = $('#dots');
    dots.innerHTML = '';
    slides.forEach((s, i) => {
      dots.append(el('button', {
        class: 'dot' + (i === cur ? ' on' : ''), title: `${i + 1}. ${s.title || s.id}`,
        onclick: () => go(i, 0),
      }));
    });
  }

  function updateHud() {
    const s = slides[cur];
    $('#prev').disabled = cur === 0 && stepIdx === 0;
    $('#next').disabled = cur === slides.length - 1 && stepIdx >= s.steps - 1;
    [...$('#dots').children].forEach((d, i) => d.classList.toggle('on', i === cur));
    const n = s.steps > 1 ? `${stepIdx + 1}/${s.steps}` : '';
    $('#hud').dataset.build = n;
    location.hash = s.id + (stepIdx ? '.' + stepIdx : '');
  }

  function go(i, step = 0, dir = i >= cur ? 1 : -1) {
    i = clamp(i, 0, slides.length - 1);
    const prev = slides[cur], next = slides[i];
    if (prev && prev !== next) {
      try { prev.leave && prev.leave(); } catch (e) { console.error(e); }
      prev.root.classList.remove('active');
      prev.root.classList.add(dir > 0 ? 'exit-left' : 'exit-right');
      const r = prev.root;
      setTimeout(() => r.classList.remove('exit-left', 'exit-right'), 700);
    }
    ensureBuilt(next);
    if (prev !== next && next.prepare) { try { next.prepare(dir); } catch (e) { console.error(e); } }
    // Pre-build the following slide so its art starts loading.
    if (slides[i + 1]) ensureBuilt(slides[i + 1]);
    const changed = prev !== next;
    cur = i;
    stepIdx = clamp(step, 0, next.steps - 1);
    if (changed) {
      next.root.classList.remove('exit-left', 'exit-right');
      next.root.classList.add(dir > 0 ? 'from-right' : 'from-left');
      void next.root.offsetWidth;
      next.root.classList.add('active');
      next.root.classList.remove('from-right', 'from-left');
      try { next.enter && next.enter(stepIdx, dir); } catch (e) { console.error(e); }
      if (window.Sound) Sound.sfx('whoosh');
    }
    try { next.step && next.step(stepIdx, dir); } catch (e) { console.error(e); }
    updateHud();
  }

  function nextStep() {
    const s = slides[cur];
    if (stepIdx < s.steps - 1) { stepIdx++; s.step && s.step(stepIdx, 1); updateHud(); if (window.Sound) Sound.sfx('tick'); }
    else if (cur < slides.length - 1) go(cur + 1, 0, 1);
  }
  function prevStep() {
    const s = slides[cur];
    if (stepIdx > 0) { stepIdx--; s.step && s.step(stepIdx, -1); updateHud(); }
    else if (cur > 0) go(cur - 1, 1e9, -1);
  }

  function typing(e) {
    const t = e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  }

  function start() {
    fit();
    window.addEventListener('resize', fit);
    renderDots();
    $('#next').addEventListener('click', nextStep);
    $('#prev').addEventListener('click', prevStep);
    $('#fs').addEventListener('click', toggleFs);
    document.addEventListener('keydown', e => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') { e.preventDefault(); nextStep(); }
      else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); prevStep(); }
      else if (k === 'Home') go(0);
      else if (k === 'End') go(slides.length - 1);
      else if (k === 'f' || k === 'F') toggleFs();
      else if (k === 'm' || k === 'M') window.Sound && Sound.toggle();
    });
    const [id, st] = location.hash.slice(1).split('.');
    const at = slides.findIndex(s => s.id === id);
    go(at < 0 ? 0 : at, +st || 0, 1);
  }

  function toggleFs() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  }

  /* Convert a pointer event to stage coordinates (1920x1080 space). */
  function stagePoint(e) {
    const r = $('#stage').getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  }

  /* Show elements marked data-at="n" once the build index reaches n. */
  function reveal(root, step) {
    root.querySelectorAll('[data-at]').forEach(n => n.classList.toggle('hidden', step < +n.dataset.at));
  }

  /* A burst of confetti over `root` (a slide). */
  function confetti(root, count = 120) {
    const colors = ['#ffc93c', '#ff4f5e', '#22d3c5', '#7b3fe4', '#9be15d', '#ff6fb5', '#5ab8ff'];
    for (let i = 0; i < count; i++) {
      const c = el('div', { class: 'confetti' });
      c.style.left = Math.random() * W + 'px';
      c.style.background = colors[i % colors.length];
      root.append(c);
      const dx = (Math.random() - .5) * 400, rot = Math.random() * 1080, dur = 1800 + Math.random() * 1800;
      c.animate([
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: `translate(${dx}px, ${H + 80}px) rotate(${rot}deg)`, opacity: 1 },
      ], { duration: dur, delay: Math.random() * 500, easing: 'cubic-bezier(.25,.6,.4,1)', fill: 'forwards' })
        .onfinish = () => c.remove();
    }
  }

  window.Deck = {
    reveal, confetti,
    W, H, add, start, go, next: nextStep, prev: prevStep, el, svg, art, sleep, tween, ease, clamp, bump, fmt, stagePoint,
    get scale() { return scale; },
    get current() { return slides[cur]; },
    isActive: id => slides[cur] && slides[cur].id === id,
  };
})();
