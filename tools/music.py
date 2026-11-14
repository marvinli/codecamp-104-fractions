#!/usr/bin/env python3
"""Generate the deck's background music with Google Lyria 3 (through OpenRouter).

Each track is an instrumental "bed" that plays quietly under the characters' voices.
Tracks go to assets/audio/music/<name>.mp3, loudness-matched with ffmpeg (all at the same
LUFS so no slide is suddenly louder), and are skipped if they already exist (delete to redo).

  python3 tools/music.py            # generate every missing track
  python3 tools/music.py space gym  # only these
"""
import base64, json, os, subprocess, sys, tempfile, urllib.request, concurrent.futures as cf
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/audio/music"
for line in (ROOT / ".env").read_text().splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1); os.environ.setdefault(k.strip(), v.strip())
KEY = os.environ["OPEN_ROUTER_KEY"]
MODEL = "google/lyria-3-pro-preview"

BED = ("Background underscore for a classroom presentation that plays under narration: "
       "steady, low-key energy the whole way through, no big build-ups or crescendos, no vocals, no singing.")
TRACKS = {
    "carnival": "Whimsical, mysterious fortune-teller carnival music: a music-box and celesta waltz, soft pizzicato "
                "strings, gentle accordion, sparkling magic chimes. Playful and a little bit spooky, kid-friendly.",
    "space": "Dreamy, wonder-filled space ambience: warm synth pads, twinkling glockenspiel, slow soft arpeggios, "
             "spacious and curious and magical, kid-friendly. No drums.",
    "office": "Comedic stuffy-office lounge music: soft bossa nova elevator jazz with brushed drums, vibraphone and "
              "muted upright bass, slightly pompous and tongue-in-cheek.",
    "draw": "Calm, cozy lo-fi music for kids quietly drawing: gentle piano, soft marimba, mellow laid-back beat, "
            "warm and focused, unhurried.",
    "gym": "Light, bouncy, playful school-gym music at a medium-low volume: plucky funky bass, soft finger snaps "
           "and light hand claps, a gentle marching snare, cheerful whistled-sounding synth melody, kid-friendly. "
           "Purely instrumental: absolutely no vocal shouts, no vocal chops, no chants, no heavy drums or drops.",
    "finale": "Warm, happy, gently celebratory carnival music: a soft music-box and glockenspiel melody over light "
              "bouncy pizzicato strings and a mellow tuba oom-pah, proud and joyful but quiet, kid-friendly. "
              "No loud brass fanfares, no big drum hits, no dramatic swells.",
}


def generate(name):
    path = OUT / f"{name}.mp3"
    if path.exists():
        return name, "cached"
    body = json.dumps({
        "model": MODEL, "stream": True, "modalities": ["audio", "text"], "audio": {"format": "mp3"},
        "messages": [{"role": "user", "content": f"{TRACKS[name]} {BED}"}],
    }).encode()
    req = urllib.request.Request("https://openrouter.ai/api/v1/chat/completions", data=body, headers={
        "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    audio = b""
    with urllib.request.urlopen(req, timeout=600) as r:
        for raw in r:
            line = raw.decode("utf-8", "replace").strip()
            if not line.startswith("data: ") or line.endswith("[DONE]"):
                continue
            try:
                d = json.loads(line[6:])
            except json.JSONDecodeError:
                continue
            if "error" in d:
                raise RuntimeError(d["error"])
            for c in d.get("choices", []):
                a = (c.get("delta") or {}).get("audio") or {}
                if a.get("data"):
                    audio += base64.b64decode(a["data"])
    if not audio:
        raise RuntimeError(f"{name}: no audio returned")
    with tempfile.NamedTemporaryFile(suffix=".mp3") as raw:
        raw.write(audio); raw.flush()
        # loudness-match every track, then a short fade at each end so loops and crossfades are seamless
        dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                             "-of", "csv=p=0", raw.name]).decode().strip())
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw.name, "-af",
                        f"loudnorm=I=-20:TP=-2:LRA=9,afade=t=in:d=1.5,afade=t=out:st={max(0, dur - 3):.2f}:d=3",
                        "-ar", "44100", "-b:a", "128k", str(path)], check=True)
    return name, f"{dur:.0f}s"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    names = sys.argv[1:] or list(TRACKS)
    with cf.ThreadPoolExecutor(6) as pool:
        for name, status in pool.map(generate, names):
            print(f"{name:10s} {status}")


if __name__ == "__main__":
    main()
