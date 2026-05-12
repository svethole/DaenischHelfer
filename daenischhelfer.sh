#!/bin/bash

PROJECT_DIR="$HOME/Nextcloud/Documents/SveTho/Sprachen/Danish/daenischhelfer"

PORT=8000

cd "$PROJECT_DIR" || {
    echo "Projektverzeichnis nicht gefunden."
    exit 1
}

echo "Starte lokalen Webserver in:"
echo "$PROJECT_DIR"
echo

echo "URL:"
echo "http://localhost:$PORT"
echo

python3 -m http.server $PORT &

SERVER_PID=$!

echo
echo "Server läuft mit PID $SERVER_PID"
echo "Zum Beenden:"
echo "kill $SERVER_PID"

wait $SERVER_PID