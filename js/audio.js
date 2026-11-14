/* Sound: synthesized UI effects (always available, no files) plus recorded clips in assets/audio.
 *   Sound.sfx(name)          synth effect: tick, whoosh, blip, ding, buzz, pop, chop, boing, sparkle, drum, fanfare, thud, coin, slide
 *   Sound.clip(path, opts)   play assets/audio/<path>.mp3 (missing files are ignored). opts: {volume, rate}
 *   Sound.voice(key|[keys])  a character line: assets/audio/voice/<key>.mp3, a random one if given a list.
 *                            Only one voice plays at a time; a new line cuts off the old one.
 *   Sound.stopVoice()
 *   Sound.music(name|null)   background track assets/audio/music/<name>.mp3, looped; crossfades from the old one.
 *                            It ducks under character voices, and the same name again just keeps playing.
 *   Sound.toggle()           mute/unmute everything (remembered per browser)
 *   Sound.toggleMusic()      background music on/off, voices and effects untouched (remembered per browser)
 */
(function () {
  let ctx = null, master = null, muted = false, voiceEl = null, musicOn = true;
  try { muted = localStorage.getItem('fc-muted') === '1'; musicOn = localStorage.getItem('fc-music') !== '0'; } catch (e) {}

  function ac() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone({ type = 'sine', f0 = 440, f1 = f0, dur = 0.15, vol = 0.3, at = 0, attack = 0.005 }) {
    const c = ac(), t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise({ dur = 0.3, vol = 0.3, at = 0, f0 = 2000, f1 = f0, q = 1, type = 'bandpass' }) {
    const c = ac(), t = c.currentTime + at;
    const len = Math.ceil(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const flt = c.createBiquadFilter(); flt.type = type; flt.Q.value = q;
    flt.frequency.setValueAtTime(f0, t);
    flt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt).connect(g).connect(master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  const FX = {
    tick: () => tone({ type: 'triangle', f0: 1400, f1: 900, dur: 0.05, vol: 0.12 }),
    whoosh: () => noise({ dur: 0.35, vol: 0.18, f0: 400, f1: 3000, q: 0.8 }),
    blip: () => tone({ type: 'square', f0: 660, f1: 990, dur: 0.08, vol: 0.1 }),
    pop: () => tone({ type: 'sine', f0: 300, f1: 1200, dur: 0.09, vol: 0.3 }),
    ding: () => { tone({ f0: 1318, dur: 0.9, vol: 0.25 }); tone({ f0: 2637, dur: 0.6, vol: 0.08 }); },
    coin: () => { tone({ type: 'square', f0: 988, dur: 0.08, vol: 0.12 }); tone({ type: 'square', f0: 1319, dur: 0.35, vol: 0.12, at: 0.08 }); },
    buzz: () => { tone({ type: 'sawtooth', f0: 140, f1: 110, dur: 0.45, vol: 0.18 }); tone({ type: 'square', f0: 147, f1: 104, dur: 0.45, vol: 0.1 }); },
    boing: () => tone({ type: 'sine', f0: 180, f1: 620, dur: 0.35, vol: 0.3 }),
    thud: () => { tone({ type: 'sine', f0: 140, f1: 40, dur: 0.3, vol: 0.5 }); noise({ dur: 0.12, vol: 0.2, f0: 300, type: 'lowpass' }); },
    chop: () => { noise({ dur: 0.18, vol: 0.35, f0: 6000, f1: 800, q: 2 }); tone({ type: 'sine', f0: 120, f1: 50, dur: 0.25, vol: 0.45, at: 0.05 }); },
    slide: () => tone({ type: 'triangle', f0: 300, f1: 900, dur: 0.25, vol: 0.12 }),
    sparkle: () => [0, 1, 2, 3, 4].forEach(i => tone({ f0: 1568 * Math.pow(1.122, i), dur: 0.25, vol: 0.08, at: i * 0.05 })),
    drum: () => { for (let i = 0; i < 18; i++) noise({ dur: 0.07, vol: 0.12 + i * 0.008, f0: 900, q: 0.7, at: i * 0.055 }); },
    fanfare: () => {
      const n = [523, 659, 784, 1047];
      n.forEach((f, i) => tone({ type: 'sawtooth', f0: f, dur: 0.16, vol: 0.09, at: i * 0.11 }));
      tone({ type: 'sawtooth', f0: 1047, dur: 0.8, vol: 0.1, at: 0.44 });
      tone({ type: 'sawtooth', f0: 784, dur: 0.8, vol: 0.07, at: 0.44 });
      tone({ type: 'sawtooth', f0: 659, dur: 0.8, vol: 0.06, at: 0.44 });
    },
    sad: () => [392, 370, 349, 330].forEach((f, i) => tone({ type: 'triangle', f0: f, f1: i === 3 ? 300 : f, dur: i === 3 ? 0.8 : 0.3, vol: 0.15, at: i * 0.3 })),
  };

  function sfx(name) {
    if (muted) return;
    try { FX[name] && FX[name](); } catch (e) {}
  }

  const cache = {};
  function clip(path, { volume = 0.8, rate = 1 } = {}) {
    if (muted) return null;
    const src = 'assets/audio/' + path + '.mp3';
    if (cache[src] === false) return null;
    const a = new Audio(src);
    a.volume = volume; a.playbackRate = rate;
    a.addEventListener('error', () => { cache[src] = false; });
    // before the first click/keypress the browser refuses; remember so a blocked voice line can be replayed
    a.play().catch(e => { if (e && e.name === 'NotAllowedError') a.blocked = true; });
    return a;
  }

  function voice(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    const key = list[Math.floor(Math.random() * list.length)];
    stopVoice();
    voiceEl = clip('voice/' + key, { volume: 1 });
    return voiceEl;
  }
  function stopVoice() { if (voiceEl) { voiceEl.pause(); voiceEl = null; } }

  /* ---- background music: one looping <audio> per track; a ticker eases every track's volume to its target ---- */
  const MUSIC_VOL = 0.2, MUSIC_DUCK = 0.07, FADE_PER_SEC = 0.35;
  const tracks = {};
  let want = null, ticker = null, lastTick = 0, blocked = false;
  const talking = () => !!voiceEl && !voiceEl.paused && !voiceEl.ended && !voiceEl.error;

  function track(name) {
    if (!tracks[name]) {
      const a = new Audio('assets/audio/music/' + name + '.mp3');
      a.loop = true; a.volume = 0; a.preload = 'auto';
      tracks[name] = a;
    }
    return tracks[name];
  }
  function tick(now) {
    const dt = Math.min(0.25, (now - lastTick) / 1000 || 0);
    lastTick = now;
    const target = muted || !musicOn ? 0 : talking() ? MUSIC_DUCK : MUSIC_VOL;
    let busy = false;
    for (const [name, a] of Object.entries(tracks)) {
      const goal = name === want ? target : 0;
      const v = a.volume + Math.sign(goal - a.volume) * Math.min(Math.abs(goal - a.volume), FADE_PER_SEC * dt);
      a.volume = Math.max(0, Math.min(1, v));
      if (goal > 0 && a.paused && !blocked && !a.starting) {
        a.starting = true;
        // browsers refuse audio before the first click/keypress; the gesture listeners below clear `blocked`
        a.play().catch(() => { blocked = true; }).finally(() => { a.starting = false; });
      }
      if (goal === 0 && a.volume === 0 && !a.paused) a.pause();
      if (!a.paused || goal > 0) busy = true;
    }
    ticker = busy ? requestAnimationFrame(tick) : null;
  }
  function kick() { if (!ticker) { lastTick = performance.now(); ticker = requestAnimationFrame(tick); } }
  function music(name) {
    want = name || null;
    if (want) {
      const a = track(want);
      // start right away (silent, then faded in) so it counts as part of the click that changed the slide
      if (a.paused && !muted && musicOn && !a.starting) {
        a.starting = true;
        a.play().catch(() => { blocked = true; }).finally(() => { a.starting = false; });
      }
    }
    kick();
  }
  function toggleMusic() {
    musicOn = !musicOn;
    try { localStorage.setItem('fc-music', musicOn ? '1' : '0'); } catch (e) {}
    paint(); kick();
  }

  function paint() {
    const b = document.getElementById('mute');
    if (!b) return;
    b.innerHTML = muted
      ? '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
    b.classList.toggle('off', muted);
    const mb = document.getElementById('music');
    if (mb) {
      mb.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>' +
        (musicOn ? '' : '<path d="M3 3l18 18"/>') + '</svg>';
      mb.classList.toggle('off', !musicOn);
    }
  }

  function toggle() {
    muted = !muted;
    try { localStorage.setItem('fc-muted', muted ? '1' : '0'); } catch (e) {}
    if (muted) stopVoice();
    paint(); kick();
  }

  document.addEventListener('DOMContentLoaded', () => {
    paint();
    const b = document.getElementById('mute');
    b && b.addEventListener('click', toggle);
    const mb = document.getElementById('music');
    mb && mb.addEventListener('click', toggleMusic);
  });
  // Browsers only allow audio after a gesture; wake the context on the first one.
  const unlock = () => {
    ac(); blocked = false; kick();
    // the line a character said before anyone clicked (e.g. Halvina's intro on a cold load) plays now
    if (voiceEl && voiceEl.blocked && !muted) { voiceEl.blocked = false; voiceEl.currentTime = 0; voiceEl.play().catch(() => {}); }
  };
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });

  window.Sound = { sfx, clip, voice, stopVoice, music, toggle, toggleMusic, get muted() { return muted; }, get musicOn() { return musicOn; }, tracks };
})();
