#!/usr/bin/env bash
# NeoBerry v2 — run_neoberry.sh
# Gestion du service NeoBerry via systemd (production) ou directement (dev).
#
# Usage:
#   sudo ./run_neoberry.sh --start
#   sudo ./run_neoberry.sh --stop
#   sudo ./run_neoberry.sh --restart
#   sudo ./run_neoberry.sh --status
#   sudo ./run_neoberry.sh --logs
#        ./run_neoberry.sh --dev      (dev mode, no sudo needed)

set -euo pipefail

SERVICE="neoberry"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="${SCRIPT_DIR}/venv"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'

info()    { echo -e "${CYAN}[NeoBerry]${NC} $*"; }
success() { echo -e "${GREEN}[NeoBerry]${NC} $*"; }
warn()    { echo -e "${YELLOW}[NeoBerry]${NC} $*"; }
error()   { echo -e "${RED}[NeoBerry] ERROR:${NC} $*"; exit 1; }

case "${1:-}" in

  --start)
    info "Démarrage de NeoBerry..."
    systemctl start "${SERVICE}"
    sleep 1
    if systemctl is-active --quiet "${SERVICE}"; then
      success "NeoBerry démarré ✓"
      IP=$(hostname -I | awk '{print $1}')
      info "Interface disponible sur : http://${IP}:5000"
    else
      error "Échec du démarrage. Voir: journalctl -u ${SERVICE} -n 30"
    fi
    ;;

  --stop)
    info "Arrêt de NeoBerry..."
    systemctl stop "${SERVICE}"
    success "NeoBerry arrêté ✓"
    ;;

  --restart)
    info "Redémarrage de NeoBerry..."
    systemctl restart "${SERVICE}"
    sleep 1
    if systemctl is-active --quiet "${SERVICE}"; then
      success "NeoBerry redémarré ✓"
    else
      error "Échec du redémarrage."
    fi
    ;;

  --status)
    echo ""
    systemctl status "${SERVICE}" --no-pager || true
    ;;

  --logs)
    journalctl -u "${SERVICE}" -f --no-pager
    ;;

  --update)
    info "Mise à jour NeoBerry depuis GitHub..."
    cd "${SCRIPT_DIR}"
    git pull origin main
    "${VENV}/bin/pip" install -r requirements.txt -q
    systemctl restart "${SERVICE}"
    success "Mise à jour terminée ✓"
    ;;

  --dev)
    # Dev mode: run directly without systemd
    warn "Mode développement — pas de Gunicorn, rechargement automatique activé"
    cd "${SCRIPT_DIR}/app"

    if [[ -f "${VENV}/bin/python" ]]; then
      PYTHON="${VENV}/bin/python"
    elif command -v python3 &>/dev/null; then
      PYTHON="python3"
    else
      error "Python3 introuvable."
    fi

    # Load .env if present
    [[ -f ".env" ]] && export $(grep -v '^#' .env | xargs) 2>/dev/null || true

    export FLASK_ENV=development
    export FLASK_DEBUG=1

    info "Démarrage en mode dev sur http://localhost:5000"
    info "Ctrl+C pour arrêter"
    "${PYTHON}" app.py
    ;;

  *)
    echo ""
    echo "NeoBerry v2 — Script de gestion"
    echo ""
    echo "Usage: sudo $0 [option]"
    echo ""
    echo "  --start    Démarrer le service"
    echo "  --stop     Arrêter le service"
    echo "  --restart  Redémarrer le service"
    echo "  --status   Voir l'état du service"
    echo "  --logs     Suivre les logs en temps réel"
    echo "  --update   Mettre à jour depuis GitHub et redémarrer"
    echo "  --dev      Lancer en mode développement (sans sudo)"
    echo ""
    ;;

esac
