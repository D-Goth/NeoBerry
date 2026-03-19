# NeoBerry v2 — GPIO Control Panel for Raspberry Pi

[![NeoBerry](https://img.shields.io/badge/🍓-NeoBerry_v2-red)](https://github.com/D-Goth/NeoBerry)
[![Python](https://img.shields.io/badge/python-3.11+-blue)](https://python.org)
[![Flask](https://img.shields.io/badge/flask-3.1.0-lightgrey)](https://flask.palletsprojects.com)
[![SocketIO](https://img.shields.io/badge/socketio-5.3.7-yellow)](https://flask-socketio.readthedocs.io)
[![Bluetooth](https://img.shields.io/badge/Bluetooth-BlueZ%2FdBus-0059E)](https://www.bluez.org)
[![GPIO](https://img.shields.io/badge/RPi-GPIO-brightgreen)](https://pypi.org/project/RPi.GPIO)
[![Licence](https://img.shields.io/badge/licence-MIT-green)](LICENSE)

---

Interface web moderne pour surveiller et contrôler un Raspberry Pi en temps réel.  
Dashboard drag-and-drop, Bluetooth complet, WebSocket natif, mode simulation intégré.

---

## 🆚 Quoi de neuf en v2 ?

### Architecture temps réel — WebSocket remplace le polling

La v1 interrogeait le serveur toutes les 3 secondes par requêtes HTTP répétées.
La v2 utilise **Flask-SocketIO** : le Pi pousse les données vers tous les clients connectés via WebSocket. La connexion reste ouverte, les mises à jour arrivent toutes les 2 secondes sans aucun overhead HTTP.

```
v1 :  client ──[GET /metrics]──▶ serveur  ×  toutes les 3s
v2 :  serveur ──[WS push]──▶ tous les clients  toutes les 2s
```

**Impact concret** : consommation CPU divisée par 3, latence d'affichage réduite, zéro "flash" d'interface lors des mises à jour.

---

### Bluetooth — module entièrement réécrit

La v1 avait un toggle on/off et une jauge à 0% (fonctionnellement incomplet).  
La v2 implémente la **gestion complète via BlueZ/dbus** :

| Fonctionnalité | v1 | v2 |
|---|---|---|
| Activation / désactivation | ✓ (basique) | ✓ |
| Scan appareils proches | ✗ | ✓ temps réel (push WS) |
| Pairing / jumelage | ✗ | ✓ avec trust automatique |
| Connexion / déconnexion | ✗ | ✓ |
| Gestion liste jumelés | ✗ | ✓ avec actions par appareil |
| Envoi de données (RFCOMM) | ✗ | ✓ Serial Port Profile |
| Intensité signal RSSI | ✗ | ✓ |
| Interface dédiée | Inline (incomplète) | ✓ Modale dédiée |
| Mode simulation | ✗ | ✓ appareils fictifs |

---

### Dashboard — widgets drag-and-drop

La v1 utilisait une page scrollable avec des sections fixes.  
La v2 utilise **GridStack.js** : chaque widget est indépendant, déplaçable et redimensionnable. Le layout est sauvegardé dans `localStorage` et restauré automatiquement.

---

### CSS — système de design unifié

| | v1 | v2 |
|---|---|---|
| Fichiers CSS | 13 fichiers séparés | 1 seul fichier (`main.css`) |
| Variables | Dispersées | Tokens CSS centralisés dans `:root` |
| Cohérence | Inégale | Uniforme sur tous les composants |
| Thème | Défini par fichier | Design system complet |

---

### Modules core — nouveautés

- **`core/storage.py`** — nouveau module : usage disque, débit lecture/écriture en temps réel
- **`core/system.py`** — températures via 3 méthodes en cascade (psutil sensors → sysfs → vcgencmd)
- **`core/network.py`** — ajout : liste des interfaces avec IP, détection connexion internet
- **`core/gpio.py`** — ajout : gestion mode input/output par pin (clic droit dans l'UI)
- **`core/auth.py`** — refactoring propre, fallback dev configurable via variables d'environnement

---

### Sécurité renforcée

- Toutes les routes REST et les événements WebSocket nécessitent une session active (`@login_required`)
- Clé secrète Flask générée aléatoirement à l'installation (stockée dans `.env`)
- Fichier sudoers dédié `/etc/sudoers.d/neoberry` (uniquement reboot/shutdown/apt)
- `.env` créé avec permissions `600` par le script d'installation

---

## ✨ Fonctionnalités complètes

- **Dashboard** — widgets déplaçables / redimensionnables, layout persistant
- **GPIO** — contrôle des 26 pins BCM (2–27), toggle HIGH/LOW, mode input/output, badge simulation
- **Surveillance système** — CPU, RAM, T° CPU, T° carte, jauges animées en temps réel
- **Stockage** — usage disque (%), débit lecture/écriture en temps réel
- **Réseau** — upload/download en temps réel, liste des interfaces, statut internet
- **Bluetooth** — scan, pairing, connexion, déconnexion, suppression, envoi RFCOMM
- **Informations système** — OS, hostname, architecture, uptime, dernière MAJ
- **Contrôles** — reboot, shutdown (confirmés), reset layout
- **Authentification** — PAM (comptes Linux) + mode dev fallback
- **Mode simulation** — GPIO, Bluetooth et PAM simulés hors Raspberry Pi

---

## 📦 Dépendances

### Python (pip)

| Paquet | Version | Rôle | v1 |
|---|---|---|---|
| Flask | 3.1.0 | Framework web | 2.3.x |
| Flask-SocketIO | 5.3.7 | WebSocket temps réel | ✗ (nouveau) |
| flask-login | 0.6.3 | Gestion sessions | ✓ |
| gunicorn | 23.0.0 | Serveur WSGI production | 20.x |
| eventlet | 0.37.0 | Driver async pour SocketIO | ✗ (nouveau) |
| psutil | 6.1.1 | Métriques système | 5.x |
| python-pam | 2.0.2 | Authentification PAM | ✓ |
| python-dotenv | 1.0.1 | Variables d'environnement | ✓ |
| RPi.GPIO | 0.7.1 | Contrôle GPIO (RPi only) | ✓ |
| requests | 2.32.3 | Requêtes HTTP | ✓ |

### Système (apt)

```bash
# Tous environnements
python3 python3-pip python3-venv

# Raspberry Pi / Linux uniquement
bluetooth bluez bluez-tools    # Bluetooth
python3-dbus python3-gi        # BlueZ Python bindings (non installable via pip)
libpam0g-dev libpam-python     # Authentification PAM
python3-gpiozero               # GPIO
```

> ⚠️ `dbus-python` et `PyGObject` doivent être installés via `apt`, pas `pip`.
> Le script `install_neoberry.sh` le fait automatiquement.

---

## 🚀 Installation

### Méthode 1 — Script automatique (Raspberry Pi / Debian)

```bash
git clone https://github.com/D-Goth/NeoBerry.git
cd NeoBerry
chmod +x install_neoberry.sh
sudo ./install_neoberry.sh
```

Le script installe les dépendances système, crée le virtualenv, génère le `.env` avec une clé secrète aléatoire, configure le service systemd et les permissions Bluetooth/GPIO.

```bash
# Démarrer après installation
sudo ./run_neoberry.sh --start

# Accès
http://<IP_DU_PI>:5000
```

### Méthode 2 — Mode développement (VM / hors Raspberry Pi)

```bash
git clone https://github.com/D-Goth/NeoBerry.git
cd NeoBerry

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

./run_neoberry.sh --dev
# ou directement :
# cd app && python app.py
```

Accès : http://localhost:5000  
Identifiants : **admin / neoberry**

> GPIO, Bluetooth et PAM sont automatiquement simulés si non disponibles.

### Sur Debian 12 (VM)

```bash
# Prérequis minimaux
sudo apt install python3 python3-pip python3-venv git -y

git clone https://github.com/D-Goth/NeoBerry.git
cd NeoBerry

python3 -m venv venv
source venv/bin/activate
pip install flask flask-login flask-socketio gunicorn eventlet psutil python-dotenv

cd app && python app.py
```

---

## 🔧 Gestion du service

```bash
sudo ./run_neoberry.sh --start    # Démarrer
sudo ./run_neoberry.sh --stop     # Arrêter
sudo ./run_neoberry.sh --restart  # Redémarrer
sudo ./run_neoberry.sh --status   # État
sudo ./run_neoberry.sh --logs     # Logs en temps réel
sudo ./run_neoberry.sh --update   # git pull + redémarrage
     ./run_neoberry.sh --dev      # Mode dev (sans sudo)
```

---

## 📁 Structure du projet

```
NeoBerry/
├── install_neoberry.sh       ← Installation complète (RPi/Debian)
├── run_neoberry.sh           ← Gestion service (start/stop/dev/logs…)
├── requirements.txt
├── DEV_READ.md               ← Guide développeur
└── app/
    ├── app.py                ← Flask + SocketIO + routes REST
    ├── .env.example
    ├── core/
    │   ├── auth.py           ← Auth PAM + fallback dev
    │   ├── bluetooth.py      ← BlueZ/dbus + simulation
    │   ├── gpio.py           ← RPi.GPIO + simulation
    │   ├── network.py        ← Bande passante + interfaces
    │   ├── storage.py        ← Disque + I/O  [nouveau v2]
    │   └── system.py         ← CPU, RAM, températures
    ├── static/
    │   ├── css/
    │   │   └── main.css      ← Système de design unifié  [refonte v2]
    │   └── js/
    │       ├── app.js        ← WebSocket, horloge, toasts
    │       ├── dashboard.js  ← GridStack + persistance layout
    │       ├── bluetooth.js  ← Modale BT complète  [nouveau v2]
    │       └── widgets/
    │           ├── gpio.js
    │           ├── system.js
    │           ├── network.js
    │           ├── storage.js  [nouveau v2]
    │           └── info.js
    └── templates/
        ├── login.html
        └── index.html
```

---

## 🔌 WebSocket — Événements

### Serveur → Client

| Événement | Fréquence | Contenu |
|---|---|---|
| `system_snapshot` | À la connexion | État complet (GPIO, system, BT, réseau, stockage) |
| `metrics` | Toutes les 2s | CPU, RAM, temp, réseau, disque |
| `gpio_state` | À chaque toggle | `{ pin, state }` broadcast |
| `bt_device_found` | Pendant un scan | Appareil découvert |
| `bt_connection_change` | Sur événement BT | `{ address, connected }` |

### Client → Serveur

| Événement | Action |
|---|---|
| `gpio_toggle` | Toggle pin GPIO (plus rapide que REST) |

---

## 🦷 Bluetooth — Utilisation

1. Cliquer sur **Bluetooth** dans la topbar (ou dans le widget Contrôles)
2. Activer le Bluetooth via le toggle en haut de la modale
3. **Panneau gauche** : lancer un scan — les appareils apparaissent en temps réel
4. Cliquer **Jumeler** sur un appareil détecté
5. **Panneau droit** : les appareils jumelés apparaissent avec leurs actions
6. Sélectionner **Données** sur un appareil connecté pour envoyer via RFCOMM

> Le scan dure 30 secondes maximum et s'arrête automatiquement.

---

## ⚡ GPIO — Utilisation

- **Clic gauche** sur un pin → bascule HIGH / LOW
- **Clic droit** sur un pin → bascule mode **output** / **input**
- Les pins en mode **input** sont affichés en bleu et ne sont pas cliquables
- Un badge **⚠ Simulation** s'affiche si RPi.GPIO est absent

---

## 🔐 Variables d'environnement

Créer `app/.env` (ou copier `app/.env.example`) :

```env
NEOBERRY_SECRET=votre_cle_secrete_aleatoire
FLASK_ENV=production

# Mode dev uniquement (sans PAM)
# NEOBERRY_DEV_USER=admin
# NEOBERRY_DEV_PASS=neoberry
```

---

## 🐛 Dépannage

**WebSocket ne se connecte pas**
```bash
# Vérifier que eventlet est bien installé
pip show eventlet
# Redémarrer avec logs
sudo ./run_neoberry.sh --logs
```

**Bluetooth inaccessible**
```bash
sudo systemctl status bluetooth
sudo usermod -aG bluetooth $USER
# Déconnexion / reconnexion de session nécessaire
```

**GPIO : permission refusée**
```bash
sudo usermod -aG gpio $USER
# Redémarrage nécessaire
```

**Erreur PAM à la connexion**
```bash
# Vérifier que l'utilisateur existe sur le système Linux
# En dev : utiliser admin / neoberry (cf .env)
```

---

## 📄 Licence

MIT — voir [LICENSE](LICENSE)

---

## 🔗 Liens

- [GitHub](https://github.com/D-Goth/NeoBerry)
- [Black-Lab](https://www.black-lab.fr)
