#!/bin/bash

set -e

# 🔍 Vérifie que git est disponible
command -v git >/dev/null || {
  echo "❌ git n’est pas installé — veuillez l’installer avant de poursuivre"
  exit 1
}

# Détecter si le script est lancé via curl | bash
if [[ "${BASH_SOURCE[0]}" == "/dev/fd/"* ]]; then
    MODE="curl"
    echo "📡 Mode installation : exécution en flux (curl | bash)"
    INSTALL_DIR="$PWD/NeoBerry"
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"

    if [ -d ".git" ]; then
      echo "📦 Le dossier NeoBerry existe déjà, le clonage est ignoré"
    else
      echo "📥 Téléchargement du dépôt NeoBerry dans $INSTALL_DIR"
      git clone https://github.com/D-Goth/NeoBerry.git . || {
        echo "❌ Échec du clonage"
        exit 1
      }
    fi
else
    MODE="local"
    echo "📁 Mode installation : script local détecté"
    REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
    cd "$REPO_ROOT"
    INSTALL_DIR="$REPO_ROOT"
fi

echo "📦 Installation dans : $INSTALL_DIR"

echo "🚀 Installation de NeoBerry (dépendances globales pour Raspberry Pi)…"

# Vérifie les droits
if [ "$EUID" -ne 0 ]; then
  echo "❌ Ce script doit être exécuté avec sudo."
  exit 1
fi

echo "🧩 Mise à jour des paquets..."
apt update && apt upgrade -y

echo "📦 Installation des paquets nécessaires..."
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

# 🔐 Ajout des droits sudo pour reboot/shutdown sans mot de passe
USERNAME="$(whoami)"
CMD_REBOOT="$(which reboot)"
CMD_SHUTDOWN="$(which shutdown)"

if sudo grep -q "$USERNAME ALL=(ALL) NOPASSWD: $CMD_REBOOT, $CMD_SHUTDOWN" /etc/sudoers; then
  echo "✓ Règles sudo déjà présentes pour $USERNAME"
else
  echo "➕ Ajout des permissions sudo pour $USERNAME"
  echo "$USERNAME ALL=(ALL) NOPASSWD: $CMD_REBOOT, $CMD_SHUTDOWN" | sudo EDITOR="tee -a" visudo
fi

echo "🔒 Vérification des groupes système nécessaires (gpio, dialout)..."

# Détection du matériel pour info
if grep -q 'Raspberry Pi' /proc/device-tree/model 2>/dev/null; then
  echo "🍓 Matériel détecté : Raspberry Pi"
else
  echo "💻 Matériel non-Raspberry, certains groupes peuvent être absents (et ce n’est pas bloquant)"
fi

for grp in gpio dialout; do
  if getent group "$grp" >/dev/null; then
    usermod -aG "$grp" "$SUDO_USER"
    echo "✅ Ajout de l’utilisateur '$SUDO_USER' au groupe '$grp'"
  else
    echo "ℹ️ Groupe '$grp' non présent sur ce système — ignoré"
  fi
done

echo "🔧 Configuration sudoers pour commandes sans mot de passe (rfkill, bluetoothctl, gpio, etc.)"
CMD_LIST="/usr/bin/rfkill, /usr/bin/bluetoothctl, /usr/bin/gpio, /usr/bin/hcitool"
SUDO_LINE="$SUDO_USER ALL=(ALL) NOPASSWD: $CMD_LIST"

if ! sudo grep -qF "$SUDO_LINE" /etc/sudoers; then
  echo "$SUDO_LINE" | sudo EDITOR="tee -a" visudo
  echo "✅ Règle ajoutée à /etc/sudoers"
else
  echo "ℹ️ Règle sudoers déjà présente"
fi

echo "🧹 Nettoyage éventuel des .pyc..."
[ -d "app" ] && find app/ -type f -name "*.pyc" -delete

echo ""
echo "🍓 NeoBerry est prêt."
echo "Retrouvez d'autres projets sur le Github/D-Goth"
echo "Et sur le site Black-Lab.fr"
echo "👉 Lancez-le avec : ./run_neoBerry.sh --start"


