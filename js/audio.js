/* Sound: synthesized UI effects (always available, no files) plus recorded clips in assets/audio.
 *   Sound.sfx(name)          synth effect: tick, whoosh, blip, ding, buzz, pop, chop, boing, sparkle, drum, fanfare, thud, coin, slide
 *   Sound.clip(path, opts)   play assets/audio/<path>.mp3 (missing files are ignored). opts: {volume, rate}
 *   Sound.voice(key|[keys])  a character line: assets/audio/voice/<key>.mp3, a random one if given a list.
 *                            Only one voice plays at a time; a new line cuts off the old one.
 *   Sound.stopVoice()
 *   Sound.toggle()           mute/unmute (remembered per browser)
 */
(function () {
  let ctx = null, master = null, muted = false, voiceEl = null;
  try { muted = localStorage.getItem('fc-muted') === '1'; } catch (e) {}

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
    a.play().catch(() => {});
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

  function paint() {
    const b = document.getElementById('mute');
    if (!b) return;
    b.innerHTML = muted
      ? '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
    b.classList.toggle('off', muted);
  }

  function toggle() {
    muted = !muted;
    try { localStorage.setItem('fc-muted', muted ? '1' : '0'); } catch (e) {}
    if (muted) stopVoice();
    paint();
  }

  document.addEventListener('DOMContentLoaded', () => {
    paint();
    const b = document.getElementById('mute');
    b && b.addEventListener('click', toggle);
  });
  // Browsers only allow audio after a gesture; wake the context on the first one.
  document.addEventListener('pointerdown', () => ac(), { once: true });
  document.addEventListener('keydown', () => ac(), { once: true });

  window.Sound = { sfx, clip, voice, stopVoice, toggle, get muted() { return muted; } };
})();
