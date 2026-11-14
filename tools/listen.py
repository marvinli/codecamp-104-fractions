#!/usr/bin/env python3
"""Ask a listening model (Gemini via OpenRouter) to compare audio clips. Usage: listen.py "<question>" a.mp3 b.mp3 ..."""
import base64, json, os, subprocess, sys, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
for l in (ROOT / ".env").read_text().splitlines():
    if "=" in l and not l.startswith("#"):
        k, v = l.split("=", 1); os.environ.setdefault(k.strip(), v.strip())
q, files = sys.argv[1], sys.argv[2:]
content = [{"type": "text", "text": q}]
for i, f in enumerate(files):
    wav = subprocess.run(["ffmpeg", "-v", "quiet", "-i", f, "-ac", "1", "-ar", "16000", "-f", "wav", "-"], capture_output=True).stdout
    content.append({"type": "text", "text": f"Clip {i + 1} ({Path(f).stem}):"})
    content.append({"type": "input_audio", "input_audio": {"data": base64.b64encode(wav).decode(), "format": "wav"}})
body = json.dumps({"model": "google/gemini-3.8-flash", "messages": [{"role": "user", "content": content}], "max_tokens": 1500}).encode()
req = urllib.request.Request("https://openrouter.ai/api/v1/chat/completions", data=body, headers={"Authorization": f"Bearer {os.environ['OPEN_ROUTER_KEY']}", "Content-Type": "application/json"})
print(json.loads(urllib.request.urlopen(req, timeout=180).read())["choices"][0]["message"]["content"])
