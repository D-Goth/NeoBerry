#!/bin/bash

# === CONFIGURATION ===
SCRIPT_DIR="$(dirname "$(realpath "$0")")"
PROJECT_DIR="$SCRIPT_DIR/app"
APP_MODULE="app:app"
GUNICORN_BIN="$(command -v gunicorn)"
WORKERS=1
PORT=5000
LOGDIR="$SCRIPT_DIR/logs"
LOGFILE="$LOGDIR/gunicorn-$(date +%F_%H-%M).log"

# === FONCTIONS UTILITAIRES ===

start_app() {
  echo "🚀 Lancement de NeoBerry..."
  mkdir -p "$LOGDIR"

  cd "$PROJECT_DIR" || {
    echo "❌ Impossible de se rendre dans $PROJECT_DIR"
    exit 1
  }

  nohup "$GUNICORN_BIN" --workers "$WORKERS" --bind "0.0.0.0:$PORT" "$APP_MODULE" > "$LOGFILE" 2>&1 &

  sleep 1
  if pgrep -f "$GUNICORN_BIN.*$APP_MODULE" > /dev/null; then
    echo "✅ NeoBerry est lancé sur le port $PORT"
    echo "📄 Logs : $LOGFILE"
  else
    echo "❌ Échec du lancement. Dernières lignes du log :"
    tail -n 15 "$LOGFILE"
    exit 1
  fi
}

stop_app() {
  echo "🛑 Arrêt de NeoBerry..."
  pkill -f "$GUNICORN_BIN.*$APP_MODULE" 2>/dev/null && echo "✅ Processus stoppé." || echo "ℹ️ Aucun processus trouvé."
}

status_app() {
  if pgrep -f "$GUNICORN_BIN.*$APP_MODULE" > /dev/null; then
    echo "🟢 NeoBerry est en cours d'exécution sur le port $PORT"
  else
    echo "🔴 NeoBerry ne tourne pas actuellement."
  fi
}

# === VÉRIFICATION GUNICORN ===
if [ -z "$GUNICORN_BIN" ]; then
  echo "❌ Gunicorn non trouvé. Installe-le avec : pip install gunicorn"
  exit 1
fi

# === DISPATCH DES COMMANDES ===
case "$1" in
  --start) start_app ;;
  --stop) stop_app ;;
  --restart)
    stop_app
    sleep 1
    start_app
    ;;
  --status) status_app ;;
  *)
    echo "🛠️ Utilisation : ./run_neoBerry.sh [--start | --stop | --restart | --status]"
    ;;
esac

