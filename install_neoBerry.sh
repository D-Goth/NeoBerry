#!/bin/bash

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

echo "🔒 Ajout de l'utilisateur courant aux groupes gpio et dialout..."
usermod -aG gpio,dialout "$SUDO_USER"

echo "🔧 Configuration sudoers pour commandes sans mot de passe (rfkill, bluetoothctl, gpio, etc.)"
CMD_LIST="/usr/bin/rfkill, /usr/bin/bluetoothctl, /usr/bin/gpio, /usr/bin/hcitool"
SUDO_LINE="$SUDO_USER ALL=(ALL) NOPASSWD: $CMD_LIST"

if ! grep -qF "$SUDO_LINE" /etc/sudoers; then
  echo "$SUDO_LINE" >> /etc/sudoers
  echo "✅ Règle ajoutée à /etc/sudoers"
else
  echo "ℹ️ Règle sudoers déjà présente"
fi

echo "🧹 Nettoyage éventuel des .pyc..."
find app/ -type f -name "*.pyc" -delete

echo "✅ Installation terminée. Tu peux maintenant lancer NeoBerry avec ./run_neoBerry.sh --start"

