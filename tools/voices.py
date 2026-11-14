#!/usr/bin/env python3
"""Render the characters' voice lines with ElevenLabs (eleven-v4) through OpenRouter.

Lines live in assets/audio/voice/*-lines.json as [{"key": "ledger/zero", "text": "...", "say": "optional text to speak"}].
The character is the key's folder (halvina, ledger, coach, tri). Voices are set in VOICES below.
Each clip goes to assets/audio/voice/<key>.mp3, is rendered once (delete it to redo), and is checked
against a transcript (scribe) so a garbled take is retried.

  python3 tools/voices.py                 # render everything missing
  python3 tools/voices.py halvina         # only one character
  python3 tools/voices.py --audition halvina "Is it five hundred?"   # one take per candidate voice → scratch dir
"""
import json, os, re, sys, time, random, uuid, urllib.request, urllib.error, concurrent.futures as cf
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/audio/voice"
for line in (ROOT / ".env").read_text().splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1); os.environ.setdefault(k.strip(), v.strip())
KEY = os.environ["OPEN_ROUTER_KEY"]
MODEL = "elevenlabs/eleven-v4"

VOICES = {
    "halvina": "DUhzmIGFwXJ752SvgcCj",   # Daria: funny, creepy-witchy young British woman
    "ledger": "7cOBG34AiHrAzs842Rdi",    # Tarquin: posh Home Counties RP, dry
    "coach": "UDYENShoqlMksjDyKqGV",     # Althea: playful, charismatic host, Filipino English
    "tri": "u9S1djswpRLiSH9spMMC",       # Birdie: expressive storyteller
}
CANDIDATES = {
    "halvina": ["DUhzmIGFwXJ752SvgcCj", "IXjM0arqqsKGKyzxvh9s", "7NsaqHdLuKNFvEfjpUno", "BMLpHVZqLTDQfQalqMJJ"],
    "ledger": ["qkG6pQFWpZTnYnoQZGFs", "7cOBG34AiHrAzs842Rdi", "tUVMjP56ZNYXlKLsRXbo", "NXaTw4ifg0LAguvKuIwZ"],
    "coach": ["pSluYDLoLKENVS7DqXYO", "AADZVMalPPU4qsB8LY9i", "UDYENShoqlMksjDyKqGV"],
}


def post(url, body, headers):
    req = urllib.request.Request(url, data=body, headers={"Authorization": f"Bearer {KEY}", **headers})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if (e.code != 429 and e.code < 500) or attempt == 5:
                raise RuntimeError(f"{e.code} {e.read()[:300]!r}") from e
            time.sleep(2 ** attempt + random.random())


def speak(voice, text):
    body = json.dumps({"model": MODEL, "input": text, "voice": voice, "response_format": "mp3"}).encode()
    return post("https://openrouter.ai/api/v1/audio/speech", body, {"Content-Type": "application/json"})


def transcribe(mp3_bytes):
    b = uuid.uuid4().hex
    def field(n, v): return f"--{b}\r\nContent-Disposition: form-data; name=\"{n}\"\r\n\r\n{v}\r\n".encode()
    body = (field("model", "elevenlabs/scribe-v2")
            + f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"a.mp3\"\r\nContent-Type: audio/mpeg\r\n\r\n".encode()
            + mp3_bytes + f"\r\n--{b}--\r\n".encode())
    try:
        return json.loads(post("https://openrouter.ai/api/v1/audio/transcriptions", body,
                               {"Content-Type": f"multipart/form-data; boundary={b}"})).get("text", "")
    except Exception as e:  # noqa: BLE001
        return f"<no transcript: {e}>"


def words(s):
    s = re.sub(r"\[[^\]]*\]", " ", s.lower())
    return re.findall(r"[a-z]+|\d+", s)


def similar(a, b):
    A, B = words(a), words(b)
    if not A: return 1.0
    hit = sum(1 for w in A if w in B)
    return hit / len(A)


def render(item):
    key, text = item["key"], item.get("say") or item["text"]
    char = key.split("/")[0]
    path = OUT / f"{key}.mp3"
    if path.exists():
        return key, "cached"
    path.parent.mkdir(parents=True, exist_ok=True)
    best = None
    for take in range(3):
        audio = speak(VOICES[char], text)
        heard = transcribe(audio)
        score = similar(item["text"] if not item.get("say") else text, heard)
        if best is None or score > best[0]:
            best = (score, audio, heard)
        if score >= 0.8 or heard.startswith("<no transcript"):
            break
    path.write_bytes(best[1])
    return key, f"{best[0]:.2f} heard: {best[2][:80]}"


def main():
    args = sys.argv[1:]
    if args and args[0] == "--audition":
        char, text = args[1], args[2]
        out = Path(os.environ.get("AUDITION_DIR", "/tmp")) / f"audition-{char}"
        out.mkdir(parents=True, exist_ok=True)
        for v in CANDIDATES[char]:
            (out / f"{v}.mp3").write_bytes(speak(v, text))
            print(out / f"{v}.mp3")
        return
    only = set(args)
    items = []
    for f in sorted(OUT.glob("*-lines.json")):
        for it in json.loads(f.read_text()):
            if not only or it["key"].split("/")[0] in only:
                items.append(it)
    with cf.ThreadPoolExecutor(6) as pool:
        for key, status in pool.map(render, items):
            print(f"{key:32s} {status}")


if __name__ == "__main__":
    main()
