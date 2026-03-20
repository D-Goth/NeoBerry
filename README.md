# NeoBerry v2 — Dashboard Raspberry Pi

[![NeoBerry](https://img.shields.io/badge/🍓-NeoBerry_v2-red)](https://github.com/D-Goth/NeoBerry)
[![Python](https://img.shields.io/badge/python-3.11+-blue)](https://python.org)
[![Flask](https://img.shields.io/badge/flask-3.1+-lightgrey)](https://flask.palletsprojects.com)
[![SocketIO](https://img.shields.io/badge/flask--socketio-5.3+-yellow)](https://flask-socketio.readthedocs.io)
[![Bluetooth](https://img.shields.io/badge/Bluetooth-BlueZ%2FdBus-0059cc)](https://www.bluez.org)
[![GPIO](https://img.shields.io/badge/RPi-GPIO-brightgreen)](https://pypi.org/project/RPi.GPIO)
[![Licence](https://img.shields.io/badge/licence-MIT-green)](LICENSE)

> Interface web pour surveiller et contrôler un Raspberry Pi en temps réel.
> Dashboard drag-and-drop · Bluetooth complet · WebSocket natif · Mode simulation intégré.

---

## 🚀 Installation rapide

```bash
git clone -b v2-dev https://github.com/D-Goth/NeoBerry.git
cd NeoBerry
bash install_neoberry.sh
```

Le script se ré-élève seul en `sudo` — pas besoin de le préfixer. Il installe les dépendances système, crée le virtualenv, génère le `.env` et configure le service systemd.

```bash
# Démarrer
bash run_neoberry.sh --start

# Accès
http://<IP_DU_PI>:5000
```

Connexion avec votre **compte Linux** (authentification PAM).

---

## 🧪 Mode développement (VM / hors Raspberry Pi)

```bash
git clone -b v2-dev https://github.com/D-Goth/NeoBerry.git
cd NeoBerry

python3 -m venv venv
source venv/bin/activate
pip install flask flask-login flask-socketio gunicorn psutil python-dotenv requests

bash run_neoberry.sh --dev
```

Accès : `http://localhost:5000`  
Identifiants dev : **admin / neoberry**

> GPIO, Bluetooth et PAM sont automatiquement simulés si non disponibles.  
> Aucune erreur — le mode simulation s'active seul à la détection.

---

## 🔧 Gestion du service

Toutes les commandes utilisent `bash script.sh` — le script se ré-élève en `sudo` automatiquement pour les actions qui en ont besoin.

```bash
bash run_neoberry.sh --start     # Démarrer
bash run_neoberry.sh --stop      # Arrêter
bash run_neoberry.sh --restart   # Redémarrer
bash run_neoberry.sh --status    # État du service
bash run_neoberry.sh --logs      # Logs en direct (Ctrl+C pour quitter)
bash run_neoberry.sh --update    # git pull + redémarrage automatique
bash run_neoberry.sh --dev       # Mode développement (sans root)
bash run_neoberry.sh --help      # Aide
```

---

## ✨ Fonctionnalités

### Dashboard
- Widgets **drag-and-drop** et redimensionnables (GridStack.js)
- Layout sauvegardé dans `localStorage`, restauré au rechargement
- Bouton "Reset layout" pour revenir à la disposition par défaut

### GPIO
- Contrôle des **26 pins BCM** (GPIO 2–27)
- **Clic gauche** → bascule HIGH / LOW
- **Clic droit** → bascule mode output / input
- Pins optimisés pour usage **tactile** (tablette, téléphone)
- Badge simulation si RPi.GPIO absent

### Surveillance système
- **4 jauges** doughnut animées — Charge CPU, T° CPU, Charge RAM, T° Carte
- Gradient dynamique : bleu (0%) → vert → jaune → orange → rouge → violet (100%)
- **Fréquence CPU** en MHz (psutil / vcgencmd / sysfs)
- **Swap** utilisé/total avec barre de progression
- **Détection throttling** et sous-tension (vcgencmd, RPi uniquement)
- **Top 5 processus** CPU + RAM avec barres visuelles

### Réseau
- Upload / Download en temps réel
- Liste des interfaces réseau avec IP
- Statut connexion internet

### Stockage
- 3 jauges : capacité disque %, débit écriture, débit lecture
- Même gradient que les jauges système

### Alimentation / Batterie
- Détection automatique : sysfs (UPS HAT) → INA219 (I2C) → PoE HAT → simulation
- Niveau %, tension, courant, puissance
- Icône batterie animée (charge en cours)
- Graphique historique de tension (Chart.js)

### Bluetooth
- Modale dédiée, accessible depuis la topbar
- **Scan** des appareils proches en temps réel (push WebSocket)
- **Pairing** avec trust automatique
- **Connexion / déconnexion**
- **Gestion** de la liste des appareils jumelés
- **Envoi de données** via RFCOMM (Serial Port Profile)
- Indicateur RSSI, icônes par type d'appareil
- Mode simulation avec appareils fictifs

### Contrôles
- **Update RPi** — lance `apt-get upgrade` en arrière-plan (pastille verte)
- **Reboot RPi** — redémarre le Pi (pastille orange)
- **Shutdown RPi** — éteint le Pi (pastille rouge)
- **Restart NeoBerry** — redémarre uniquement le service (pastille cyan)
- Liens **GitHub** et **Black-Lab.fr** avec effet rainbow

### Informations système
- OS, hostname, architecture, uptime, date dernière MAJ

### Authentification
- **PAM** — comptes Linux système (production)
- **Fallback dev** — `admin / neoberry` si PAM indisponible

---

## 🆚 Changements v1 → v2

| | v1 | v2 |
|---|---|---|
| Temps réel | Polling HTTP toutes les 3s | WebSocket push toutes les 2s |
| CSS | 13 fichiers séparés | 1 fichier `main.css` unifié |
| Navigation | Scroll infini | Dashboard drag-and-drop |
| Bluetooth | Toggle + jauge vide | Module complet BlueZ/dbus |
| Stockage | Absent | 3 jauges + débit I/O |
| Surveillance | CPU/RAM/Temp | + Fréquence, Swap, Throttling, Top procs |
| Batterie | Basique | Auto-détection multi-sources + graphique |
| Scripts | `sudo ./script.sh` | `bash script.sh` (auto-sudo) |
| Serveur | Werkzeug / eventlet | Gunicorn gthread (stable) |
| Horloge | Widget page | Topbar avec jours de la semaine |

---

## 📦 Dépendances Python

| Paquet | Rôle |
|---|---|
| Flask | Framework web |
| Flask-SocketIO | WebSocket temps réel |
| flask-login | Gestion sessions |
| gunicorn | Serveur WSGI production (worker: gthread) |
| psutil | Métriques système |
| python-pam | Authentification PAM (optionnel via pip, disponible via apt) |
| python-dotenv | Variables d'environnement |
| RPi.GPIO | GPIO (RPi uniquement, ignoré sinon) |
| requests | Requêtes HTTP |

> ⚠️ **Pas d'eventlet.** NeoBerry v2 utilise le mode `threading` de Flask-SocketIO avec Gunicorn `gthread`. Eventlet cause des erreurs `AssertionError: write() before start_response` — ne pas l'installer.

### Dépendances système (apt)

```bash
# Base
python3 python3-pip python3-venv git

# Bluetooth (BlueZ dbus — non installable via pip)
python3-dbus python3-gi bluetooth bluez bluez-tools

# GPIO
python3-gpiozero

# PAM
libpam0g-dev python3-pam
```

---

## 📁 Structure

```
NeoBerry/
├── install_neoberry.sh     ← Installateur (auto-sudo, systemd, groupes)
├── run_neoberry.sh         ← Gestionnaire service (start/stop/dev/logs…)
├── requirements.txt
├── DEV_READ.md             ← Guide développeur
└── app/
    ├── app.py              ← Flask + SocketIO + routes REST
    ├── .env.example
    ├── core/
    │   ├── auth.py         ← PAM + fallback dev
    │   ├── battery.py      ← Multi-sources : sysfs / INA219 / PoE / sim
    │   ├── bluetooth.py    ← BlueZ/dbus + simulation
    │   ├── gpio.py         ← RPi.GPIO + simulation
    │   ├── network.py      ← Bande passante + interfaces
    │   ├── storage.py      ← Disque + I/O
    │   └── system.py       ← CPU, RAM, temp, freq, swap, throttling, procs
    ├── static/
    │   ├── css/main.css    ← Design system (#FF1654, glassmorphisme, tokens)
    │   └── js/
    │       ├── app.js      ← WebSocket, horloge topbar, toasts, actions
    │       ├── dashboard.js← GridStack + persistance layout
    │       ├── bluetooth.js← Modale Bluetooth complète
    │       └── widgets/
    │           ├── gpio.js
    │           ├── system.js
    │           ├── network.js
    │           ├── storage.js
    │           ├── battery.js
    │           └── info.js
    └── templates/
        ├── login.html
        └── index.html
```

---

## 🔌 WebSocket — Événements

| Événement | Sens | Déclencheur | Contenu |
|---|---|---|---|
| `system_snapshot` | Serveur → Client | Connexion | État complet initial |
| `metrics` | Serveur → Client | Toutes les 2s | CPU, RAM, temp, réseau, disque, batterie |
| `gpio_state` | Serveur → Client | Après toggle | `{ pin, state }` broadcast |
| `bt_device_found` | Serveur → Client | Scan actif | Appareil détecté |
| `bt_connection_change` | Serveur → Client | Événement BT | `{ address, connected }` |
| `gpio_toggle` | Client → Serveur | Clic pin | `{ pin, state }` |

---

## 🔐 Variables d'environnement

Fichier `app/.env` (généré automatiquement par `install_neoberry.sh`) :

```env
# Clé secrète Flask — générée aléatoirement à l'installation
NEOBERRY_SECRET=xxxxx

# Environnement
FLASK_ENV=production

# Credentials fallback dev (PAM indisponible uniquement)
# NEOBERRY_DEV_USER=admin
# NEOBERRY_DEV_PASS=neoberry
```

---

## 🐛 Dépannage

**`sudo: ./run_neoberry.sh: commande introuvable`**
```bash
# Utiliser bash, pas ./
bash run_neoberry.sh --start
```

**Logs d'erreur `AssertionError: write() before start_response`**
```bash
# Eventlet installé par erreur — le désinstaller
source venv/bin/activate
pip uninstall eventlet -y
bash run_neoberry.sh --restart
```

**Badge WebSocket rouge / "Déconnecté"**
```bash
bash run_neoberry.sh --logs
# Chercher la cause dans les logs, souvent lié à eventlet (voir ci-dessus)
```

**Bluetooth inaccessible**
```bash
sudo systemctl status bluetooth
sudo usermod -aG bluetooth $USER
# Reconnexion de session nécessaire
```

**GPIO : permission refusée**
```bash
sudo usermod -aG gpio $USER
# Redémarrage nécessaire
```

**PAM refuse la connexion**
```bash
# Vérifier que l'utilisateur existe bien sur le système Linux
id $USER
# En mode dev (sans PAM) : utiliser admin / neoberry
```

**Température affiche `0°C` ou `—`**
```bash
# Normal sur VM — vcgencmd n'existe que sur RPi
# Sur le Pi, vérifier :
vcgencmd measure_temp
```

---

## 📄 Licence

MIT — voir [LICENSE](LICENSE)

---

## 🔗 Liens

- [GitHub — NeoBerry](https://github.com/D-Goth/NeoBerry)
- [Black-Lab.fr](https://www.black-lab.fr)
