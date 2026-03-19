#!/usr/bin/env bash
# NeoBerry v2 — install_neoberry.sh
# Full installation on a Raspberry Pi (Raspberry Pi OS / Debian-based).
# Run as root: sudo ./install_neoberry.sh

set -euo pipefail

NEOBERRY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="neoberry"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
VENV_DIR="${NEOBERRY_DIR}/venv"
APP_USER="${SUDO_USER:-pi}"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'

info()    { echo -e "${CYAN}[NeoBerry]${NC} $*"; }
success() { echo -e "${GREEN}[NeoBerry]${NC} $*"; }
error()   { echo -e "${RED}[NeoBerry] ERROR:${NC} $*"; exit 1; }

# ── Root check ────────────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && error "Ce script doit être exécuté en root (sudo)."

info "Démarrage de l'installation NeoBerry v2..."

# ── System packages ───────────────────────────────────────────────────────────
info "Mise à jour des paquets système..."
apt-get update -qq

info "Installation des dépendances système..."
apt-get install -y \
  python3 python3-pip python3-venv \
  python3-dbus python3-gi \
  libpam0g-dev libpam-python \
  bluetooth bluez bluez-tools \
  python3-gpiozero \
  libglib2.0-dev

# ── Virtual environment ───────────────────────────────────────────────────────
info "Création de l'environnement virtuel Python..."
python3 -m venv "${VENV_DIR}" --system-site-packages
# --system-site-packages allows access to dbus/gi installed via apt

info "Installation des dépendances Python..."
"${VENV_DIR}/bin/pip" install --upgrade pip -q
"${VENV_DIR}/bin/pip" install -r "${NEOBERRY_DIR}/requirements.txt" -q

# ── .env file ─────────────────────────────────────────────────────────────────
ENV_FILE="${NEOBERRY_DIR}/app/.env"
if [[ ! -f "${ENV_FILE}" ]]; then
  info "Création du fichier .env..."
  SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
  cat > "${ENV_FILE}" << EOF
NEOBERRY_SECRET=${SECRET}
FLASK_ENV=production
EOF
  chmod 600 "${ENV_FILE}"
  success ".env créé avec une clé secrète aléatoire."
else
  info ".env déjà présent, aucune modification."
fi

# ── sudoers for reboot/shutdown ───────────────────────────────────────────────
SUDOERS_FILE="/etc/sudoers.d/neoberry"
info "Configuration sudoers pour reboot/shutdown..."
cat > "${SUDOERS_FILE}" << EOF
# NeoBerry v2 — allow Flask user to reboot/shutdown
${APP_USER} ALL=(ALL) NOPASSWD: /sbin/reboot, /sbin/shutdown, /usr/bin/apt-get update, /usr/bin/apt-get upgrade
EOF
chmod 0440 "${SUDOERS_FILE}"

# ── Systemd service ───────────────────────────────────────────────────────────
info "Installation du service systemd..."
cat > "${SERVICE_FILE}" << EOF
[Unit]
Description=NeoBerry v2 — Raspberry Pi Dashboard
After=network.target bluetooth.target
Wants=bluetooth.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${NEOBERRY_DIR}/app
EnvironmentFile=${NEOBERRY_DIR}/app/.env
ExecStart=${VENV_DIR}/bin/gunicorn \
    --worker-class eventlet \
    -w 1 \
    --bind 0.0.0.0:5000 \
    --timeout 120 \
    --log-level info \
    app:app
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"

# ── Bluetooth setup ───────────────────────────────────────────────────────────
info "Configuration Bluetooth..."
usermod -aG bluetooth "${APP_USER}" 2>/dev/null || true
systemctl enable bluetooth
systemctl start  bluetooth || true

# ── GPIO setup ────────────────────────────────────────────────────────────────
info "Configuration GPIO..."
usermod -aG gpio "${APP_USER}" 2>/dev/null || true

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
success "═══════════════════════════════════════════════"
success " NeoBerry v2 installé avec succès !"
success "═══════════════════════════════════════════════"
echo ""
info "Pour démarrer maintenant :"
echo "  sudo systemctl start ${SERVICE_NAME}"
echo ""
info "Pour voir les logs :"
echo "  journalctl -u ${SERVICE_NAME} -f"
echo ""
info "Accès : http://$(hostname -I | awk '{print $1}'):5000"
echo ""
info "Note : Redémarrez la session ou le Pi pour que les groupes GPIO/bluetooth soient actifs."
