#!/bin/bash

# Détection du dossier d’exécution
SCRIPT_DIR="$(dirname "$(realpath "$0")")"
PROJECT_DIR="$SCRIPT_DIR/app"
APP_MODULE="app:app"
GUNICORN_BIN="$(command -v gunicorn)"

# Config Gunicorn
WORKERS=3
PORT=5000
LOGFILE="$SCRIPT_DIR/gunicorn.log"

# Aller dans le dossier app
cd "$PROJECT_DIR" || {
  echo "❌ Impossible de se rendre dans $PROJECT_DIR"
  exit 1
}

echo "🧼 Nettoyage des anciens processus Gunicorn..."
pkill -f "$GUNICORN_BIN" 2>/dev/null

echo "🚀 Lancement de NeoBerry avec Gunicorn..."
nohup $GUNICORN_BIN --workers $WORKERS --bind 0.0.0.0:$PORT "$APP_MODULE" > "$LOGFILE" 2>&1 &

sleep 1

# Vérifier que Gunicorn tourne bien
if pgrep -f "$GUNICORN_BIN" > /dev/null; then
  echo "✅ NeoBerry tourne sur le port $PORT (logs dans $LOGFILE)"
else
  echo "❌ Gunicorn n’a pas démarré correctement. Consulte le log :"
  tail -n 15 "$LOGFILE"
  exit 1
fi
