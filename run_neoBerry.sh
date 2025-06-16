#!/bin/bash

# Chemin absolu de l'application Flask
PROJECT_DIR="$(dirname "$(realpath "$0")")/app"
APP_MODULE="app:app"
GUNICORN_BIN="/usr/bin/gunicorn"


# Nombre de workers pour gunicorn
WORKERS=3
PORT=5000

cd "$PROJECT_DIR" || {
  echo "❌ Impossible de se rendre dans $PROJECT_DIR"
  exit 1
}

echo "🚀 Lancement de NeoBerry avec Gunicorn..."
$GUNICORN_BIN --workers $WORKERS --bind 0.0.0.0:$PORT "$APP_MODULE" > gunicorn.log 2>&1 &
echo "✅ NeoBerry tourne sur le port $PORT (logs dans gunicorn.log)"
