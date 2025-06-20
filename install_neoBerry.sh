#!/bin/bash
set -e

# 🧠 Détection du mode d'exécution
if [[ "${BASH_SOURCE[0]}" == "/dev/fd/"* ]]; then
  MODE="curl"
  echo "📡 Mode installation : via flux (curl | bash)"
else
  MODE="local"
  echo "📁 Mode installation : script local"
fi

# 🛂 Vérification des droits
if [ "$EUID" -ne 0 ]; then
  echo "❌ Ce script doit être exécuté avec sudo."
  exit 1
fi

# 🔍 Vérifie la présence de git
command -v git >/dev/null || {
  echo "❌ git n’est pas installé — veuillez l’installer avant de poursuivre"
  exit 1
}

# 🏠 Répertoire d'installation : toujours ~/NeoBerry
TARGET_USER="${SUDO_USER:-$USER}"
HOME_DIR=$(eval echo "~$TARGET_USER")
INSTALL_DIR="$HOME_DIR/NeoBerry"

echo "📦 Dossier d’installation : $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 🌀 Clonage conditionnel
if [ -d ".git" ]; then
  echo "📂 Dépôt déjà présent — clonage ignoré"
else
  echo "📥 Clonage du dépôt NeoBerry..."
  git clone https://github.com/D-Goth/NeoBerry.git . || {
    echo "❌ Échec du clonage"
    exit 1
  }
fi

# 📦 Installation des dépendances système
echo "🧩 Mise à jour et installation des paquets..."
apt update && apt upgrade -y

apt install -y \
  python3 \
  python3-pip \
  python3-flask \
  python3-rpi.gpio \
  python3-psutil \
  python3-requests \
  python3-dotenv \
  python3-gunicorn \
  python3-jinja2 \
  python3-markupsafe \
  python3-click \
  python3-itsdangerous \
  git \
  curl

# 🔐 Gestion des groupes système
echo "🔒 Vérification des groupes système requis..."

if grep -q 'Raspberry Pi' /proc/device-tree/model 2>/dev/null; then
  echo "🍓 Matériel détecté : Raspberry Pi"
else
  echo "💻 Matériel générique — certains groupes peuvent être absents (ce n’est pas bloquant)"
fi

for grp in gpio dialout; do
  if getent group "$grp" >/dev/null; then
    usermod -aG "$grp" "$TARGET_USER"
    echo "✅ Ajout au groupe '$grp'"
  else
    echo "ℹ️ Groupe '$grp' non présent — ignoré"
  fi
done

# ⚙️ Configuration sudoers
echo "🔧 Configuration sudoers…"
CMD_LIST="/usr/bin/rfkill, /usr/bin/bluetoothctl, /usr/bin/gpio, /usr/bin/hcitool"
SUDO_LINE="$TARGET_USER ALL=(ALL) NOPASSWD: $CMD_LIST"

if ! grep -qF "$SUDO_LINE" /etc/sudoers; then
  echo "$SUDO_LINE" >> /etc/sudoers
  echo "✅ Règle ajoutée à /etc/sudoers"
else
  echo "ℹ️ Règle sudoers déjà présente"
fi

# 🧹 Nettoyage optionnel
echo "🧹 Nettoyage éventuel des .pyc..."
[ -d "app" ] && find app/ -type f -name "*.pyc" -delete

# ✅ Fin
echo ""
echo "🍓 Installation terminée."
echo "📁 Dossier : $INSTALL_DIR"
echo "▶️  Lancez NeoBerry avec : ./run_neoBerry.sh --start"
