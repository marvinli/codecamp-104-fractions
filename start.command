#!/bin/bash
# Double-click to run the Fraction Carnival from a tiny local web server (the most reliable way to run it).
cd "$(dirname "$0")"
PORT=8765
( sleep 1; open "http://localhost:$PORT/index.html" ) &
python3 -m http.server $PORT --bind 127.0.0.1
