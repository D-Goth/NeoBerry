#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  NeoBerry v2 — install_neoberry.sh
#  Installation complète sur Raspberry Pi / Debian / Ubuntu
#
#  Usage :
#    bash install_neoberry.sh          ← se ré-élève en sudo seul
#    sudo bash install_neoberry.sh     ← appel direct en root
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ── Auto-élévation sudo ───────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  echo "[NeoBerry] Élévation des privilèges nécessaire..."
  exec sudo bash "$0" "$@"
fi

# ── Variables ─────────────────────────────────────────────────
NEOBERRY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="neoberry"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
VENV_DIR="${NEOBERRY_DIR}/venv"
APP_USER="${SUDO_USER:-$(logname 2>/dev/null || echo pi)}"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${CYAN}[NeoBerry]${NC} $*"; }
success() { echo -e "${GREEN}[NeoBerry]${NC} $*"; }
warn()    { echo -e "${YELLOW}[NeoBerry]${NC} $*"; }
error()   { echo -e "${RED}[NeoBerry] ERREUR :${NC} $*"; exit 1; }

echo ""
echo -e "${RED}  ███╗   ██╗███████╗ ██████╗ ${NC}"
echo -e "${RED}  ████╗  ██║██╔════╝██╔═══██╗${NC}"
echo -e "${RED}  ██╔██╗ ██║█████╗  ██║   ██║${NC}"
echo -e "${RED}  ██║╚██╗██║██╔══╝  ██║   ██║${NC}"
echo -e "${RED}  ██║ ╚████║███████╗╚██████╔╝${NC}"
echo -e "${RED}  ╚═╝  ╚═══╝╚══════╝ ╚═════╝ ${NC}"
echo -e "  ${CYAN}NeoBerry v2 — Installateur${NC}"
echo ""
info "Répertoire : ${NEOBERRY_DIR}"
info "Utilisateur : ${APP_USER}"
echo ""

# ── Paquets système ────────────────────────────────────────────
info "Mise à jour des paquets..."
apt-get update -qq

info "Installation des dépendances système..."
apt-get install -y \
  python3 python3-pip python3-venv \
  python3-dbus python3-gi \
  libpam0g-dev python3-pam \
  bluetooth bluez bluez-tools \
  python3-gpiozero \
  libglib2.0-dev \
  git curl 2>/dev/null || warn "Certains paquets optionnels non disponibles (normal hors RPi)"

# ── Virtualenv ─────────────────────────────────────────────────
info "Création de l'environnement virtuel Python..."
# --system-site-packages = accès à dbus/gi installés via apt
python3 -m venv "${VENV_DIR}" --system-site-packages

info "Mise à jour de pip..."
"${VENV_DIR}/bin/pip" install --upgrade pip -q

info "Installation des dépendances Python..."
# Exclure eventlet — incompatible avec le mode threading de Flask-SocketIO
"${VENV_DIR}/bin/pip" install \
  flask flask-login flask-socketio \
  gunicorn \
  psutil python-dotenv requests \
  six \
  -q
# python-pam en option (pas dispo partout via pip)
"${VENV_DIR}/bin/pip" install python-pam -q 2>/dev/null \
  || warn "python-pam non installé via pip — PAM système sera utilisé si disponible"

# ── Fichier .env ───────────────────────────────────────────────
ENV_FILE="${NEOBERRY_DIR}/app/.env"
if [[ ! -f "${ENV_FILE}" ]]; then
  info "Génération du fichier .env..."
  SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
  cat > "${ENV_FILE}" << ENVEOF
NEOBERRY_SECRET=${SECRET}
FLASK_ENV=production
ENVEOF
  chmod 600 "${ENV_FILE}"
  chown "${APP_USER}:${APP_USER}" "${ENV_FILE}" 2>/dev/null || true
  success ".env créé avec une clé secrète aléatoire."
else
  info ".env déjà présent, ignoré."
fi

# ── Sudoers ────────────────────────────────────────────────────
SUDOERS_FILE="/etc/sudoers.d/neoberry"
info "Configuration sudoers..."
cat > "${SUDOERS_FILE}" << SUDOEOF
# NeoBerry v2 — actions système sans mot de passe
${APP_USER} ALL=(ALL) NOPASSWD: /sbin/reboot, /sbin/shutdown, /usr/sbin/shutdown
${APP_USER} ALL=(ALL) NOPASSWD: /usr/bin/apt-get update, /usr/bin/apt-get upgrade -y
SUDOEOF
chmod 0440 "${SUDOERS_FILE}"
# Valider la syntaxe sudoers
visudo -c -f "${SUDOERS_FILE}" > /dev/null 2>&1 || {
  warn "Sudoers invalide, suppression pour éviter de bloquer sudo"
  rm -f "${SUDOERS_FILE}"
}

# ── Service systemd ────────────────────────────────────────────
info "Création du service systemd..."
cat > "${SERVICE_FILE}" << SVCEOF
[Unit]
Description=NeoBerry v2 — Raspberry Pi Dashboard
After=network.target bluetooth.target
Wants=bluetooth.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${NEOBERRY_DIR}/app
EnvironmentFile=${NEOBERRY_DIR}/app/.env
# Mode threading — PAS d'eventlet
ExecStart=${VENV_DIR}/bin/gunicorn \\
    --worker-class gthread \\
    --workers 1 \\
    --threads 4 \\
    --bind 0.0.0.0:5000 \\
    --timeout 120 \\
    --log-level warning \\
    app:app
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=neoberry

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
success "Service systemd configuré."

# ── Autostart au démarrage ────────────────────────────────────
echo ""
read -r -p "$(echo -e "${CYAN}[NeoBerry]${NC} Lancer NeoBerry automatiquement au démarrage ? [O/n] : ")" AUTOSTART
AUTOSTART="${AUTOSTART:-O}"

if [[ "${AUTOSTART,,}" =~ ^(o|oui|y|yes)$ ]]; then
  systemctl enable "${SERVICE_NAME}"
  success "Démarrage automatique activé ✓"
else
  systemctl disable "${SERVICE_NAME}" 2>/dev/null || true
  warn "Démarrage automatique désactivé — lancez manuellement : bash run_neoberry.sh --start"
fi

# ── Démarrer maintenant ? ─────────────────────────────────────
echo ""
read -r -p "$(echo -e "${CYAN}[NeoBerry]${NC} Démarrer NeoBerry maintenant ? [O/n] : ")" STARTNOW
STARTNOW="${STARTNOW:-O}"

if [[ "${STARTNOW,,}" =~ ^(o|oui|y|yes)$ ]]; then
  systemctl start "${SERVICE_NAME}"
  sleep 2
  if systemctl is-active --quiet "${SERVICE_NAME}"; then
    IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
    success "NeoBerry démarré ✓ → http://${IP}:5000"
  else
    warn "Démarrage échoué — vérifiez : bash run_neoberry.sh --logs"
  fi
fi

# ── Permissions groupes ────────────────────────────────────────
info "Ajout de ${APP_USER} aux groupes bluetooth/gpio..."
usermod -aG bluetooth "${APP_USER}" 2>/dev/null || true
usermod -aG gpio      "${APP_USER}" 2>/dev/null || true
usermod -aG dialout   "${APP_USER}" 2>/dev/null || true

# ── Bluetooth ──────────────────────────────────────────────────
systemctl enable bluetooth 2>/dev/null || true
systemctl start  bluetooth 2>/dev/null || true

# ── Permissions fichiers ───────────────────────────────────────
chown -R "${APP_USER}:${APP_USER}" "${NEOBERRY_DIR}" 2>/dev/null || true
chmod +x "${NEOBERRY_DIR}/run_neoberry.sh"

# ── Résumé ─────────────────────────────────────────────────────
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
echo ""
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  NeoBerry v2 installé avec succès ! 🍓${NC}"
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo ""
echo -e "  Démarrer :  ${CYAN}bash ${NEOBERRY_DIR}/run_neoberry.sh --start${NC}"
echo -e "  Logs :      ${CYAN}bash ${NEOBERRY_DIR}/run_neoberry.sh --logs${NC}"
echo -e "  Accès :     ${CYAN}http://${IP}:5000${NC}"
echo ""
warn "Reconnectez-vous ou redémarrez pour activer les groupes bluetooth/gpio."
echo ""
