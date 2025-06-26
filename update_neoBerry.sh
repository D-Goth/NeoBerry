#!/bin/bash

set -e

# 📍 Chemin absolu du dossier NeoBerry (où se trouve ce script)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/logs"
LOG_FILE="$LOG_DIR/update.log"

mkdir -p "$LOG_DIR"

NOW="$(date '+%Y-%m-%d %H:%M:%S')"
echo -e "\n[$NOW] 🛠️ Démarrage de la mise à jour système" | tee -a "$LOG_FILE"

# ⬇️ Update des paquets système
echo "[…] Nettoyage apt…" | tee -a "$LOG_FILE"
sudo apt clean >> "$LOG_FILE" 2>&1

echo "[…] sudo apt update" | tee -a "$LOG_FILE"
sudo apt update >> "$LOG_FILE" 2>&1

echo "[…] sudo apt full-upgrade -y" | tee -a "$LOG_FILE"
sudo apt full-upgrade -y >> "$LOG_FILE" 2>&1

echo "[…] autoremove + autoclean" | tee -a "$LOG_FILE"
sudo apt autoremove -y >> "$LOG_FILE" 2>&1
sudo apt autoclean >> "$LOG_FILE" 2>&1

END="$(date '+%Y-%m-%d %H:%M:%S')"
echo "[$END] ✅ Mise à jour complète terminée" | tee -a "$LOG_FILE"

