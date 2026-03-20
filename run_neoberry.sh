#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  NeoBerry v2 — run_neoberry.sh
#  Gestion du service NeoBerry
#
#  Usage (PAS besoin de sudo — le script se ré-élève seul) :
#    bash run_neoberry.sh --start
#    bash run_neoberry.sh --stop
#    bash run_neoberry.sh --restart
#    bash run_neoberry.sh --status
#    bash run_neoberry.sh --logs
#    bash run_neoberry.sh --update
#    bash run_neoberry.sh --dev      ← mode développement, sans root
# ═══════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE="neoberry"
VENV="${SCRIPT_DIR}/venv"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${CYAN}[NeoBerry]${NC} $*"; }
success() { echo -e "${GREEN}[NeoBerry]${NC} $*"; }
warn()    { echo -e "${YELLOW}[NeoBerry]${NC} $*"; }
error()   { echo -e "${RED}[NeoBerry] ERREUR :${NC} $*"; exit 1; }

# ── Commandes qui nécessitent root ─────────────────────────────
_needs_root() {
  local cmd="${1:-}"
  case "$cmd" in
    --start|--stop|--restart|--update) return 0 ;;
    *) return 1 ;;
  esac
}

# Auto-élévation uniquement pour les commandes qui en ont besoin
if _needs_root "${1:-}" && [[ $EUID -ne 0 ]]; then
  exec sudo bash "$0" "$@"
fi

# ── Vérification service installé ─────────────────────────────
_check_service() {
  if ! systemctl list-unit-files 2>/dev/null | grep -q "^${SERVICE}.service"; then
    error "Service '${SERVICE}' non trouvé. Lancez d'abord : bash install_neoberry.sh"
  fi
}

case "${1:-}" in

  --start)
    _check_service
    info "Démarrage de NeoBerry..."
    systemctl start "${SERVICE}"
    sleep 2
    if systemctl is-active --quiet "${SERVICE}"; then
      IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
      success "NeoBerry démarré ✓"
      info "Accès : http://${IP}:5000"
    else
      error "Échec du démarrage. Lancez : bash run_neoberry.sh --logs"
    fi
    ;;

  --stop)
    _check_service
    info "Arrêt de NeoBerry..."
    systemctl stop "${SERVICE}"
    success "NeoBerry arrêté ✓"
    ;;

  --restart)
    _check_service
    info "Redémarrage de NeoBerry..."
    systemctl restart "${SERVICE}"
    sleep 2
    if systemctl is-active --quiet "${SERVICE}"; then
      success "NeoBerry redémarré ✓"
    else
      error "Échec du redémarrage. Lancez : bash run_neoberry.sh --logs"
    fi
    ;;

  --status)
    systemctl status "${SERVICE}" --no-pager -l || true
    ;;

  --logs)
    info "Logs en direct (Ctrl+C pour quitter)..."
    journalctl -u "${SERVICE}" -f --no-pager
    ;;

  --update)
    info "Mise à jour NeoBerry depuis GitHub..."
    cd "${SCRIPT_DIR}"
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    git pull origin "${BRANCH}" || error "Échec du git pull"
    info "Mise à jour des dépendances Python..."
    "${VENV}/bin/pip" install \
      flask flask-login flask-socketio gunicorn \
      psutil python-dotenv requests -q
    systemctl restart "${SERVICE}"
    success "NeoBerry mis à jour et redémarré ✓"
    ;;

  --dev)
    # Mode dev — sans systemd, sans root
    warn "Mode développement — Flask dev server"
    warn "NE PAS utiliser en production !"
    echo ""

    cd "${SCRIPT_DIR}/app"

    # Choisir l'interpréteur Python
    if   [[ -f "${VENV}/bin/python" ]]; then PYTHON="${VENV}/bin/python"
    elif command -v python3 &>/dev/null;  then PYTHON="python3"
    else error "Python3 introuvable. Installez-le d'abord."
    fi

    # Charger .env si présent
    if [[ -f ".env" ]]; then
      set -a
      # shellcheck disable=SC1091
      source .env
      set +a
      info ".env chargé"
    fi

    export FLASK_ENV=development

    IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
    info "Démarrage sur http://${IP}:5000 (aussi http://localhost:5000)"
    info "Ctrl+C pour arrêter"
    echo ""
    "${PYTHON}" app.py
    ;;

  --help|-h|"")
    echo ""
    echo -e "${CYAN}NeoBerry v2 — Gestionnaire de service${NC}"
    echo ""
    echo "  Usage : bash run_neoberry.sh [commande]"
    echo ""
    echo -e "  ${GREEN}--start${NC}    Démarrer le service"
    echo -e "  ${GREEN}--stop${NC}     Arrêter le service"
    echo -e "  ${GREEN}--restart${NC}  Redémarrer le service"
    echo -e "  ${CYAN}--status${NC}   Voir l'état du service"
    echo -e "  ${CYAN}--logs${NC}     Suivre les logs en direct"
    echo -e "  ${CYAN}--update${NC}   Mettre à jour depuis GitHub"
    echo -e "  ${YELLOW}--dev${NC}      Lancer en mode développement (sans root)"
    echo ""
    echo "  Note : les commandes qui nécessitent root"
    echo "         se ré-élèvent automatiquement en sudo."
    echo ""
    ;;

  *)
    error "Commande inconnue : '${1}'. Lancez : bash run_neoberry.sh --help"
    ;;

esac
