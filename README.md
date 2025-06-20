# NeoBerry GPIO Control - 🇫🇷

**NeoBerry GPIO Control** est une application web permettant de surveiller et contrôler les GPIO d'un Raspberry Pi via une interface moderne et responsive.

---

## ✨ Fonctionnalités

- Interface web intuitive et responsive  
- Affichage et contrôle des broches GPIO  
- Surveillance des performances système (CPU, RAM, température, réseau)  
- Gestion sécurisée via login avec authentification PAM  
- Boutons de reboot et shutdown (protégés)  
- Mode test hors Raspberry Pi avec simulation GPIO  

---
![NeoBerry](https://img.shields.io/badge/🍓-NeoBerry-red)
![Python](https://img.shields.io/badge/python-3.13-blue)
![JavaScript](https://img.shields.io/badge/javascript-ES6-yellow)
![HTML](https://img.shields.io/badge/html-5-orange)
![CSS](https://img.shields.io/badge/css-3-blueviolet)
![Flask](https://img.shields.io/badge/flask-2.3-lightgrey)
![PAM](https://img.shields.io/badge/authentication-PAM-critical)
![GPIO](https://img.shields.io/badge/RPi-GPIO-brightgreen)
![BLE](https://img.shields.io/badge/Bluetooth-LE-00599e)
![Licence](https://img.shields.io/badge/licence-MIT-green)

---

## Structure

NeoBerry/
├── LICENSE
├── NeoBerryTree.txt
├── README.txt
├── run_neoBerry.sh
├── install_neoBerry.sh
└── app/
    ├── app.py
    ├── core/
    │   ├── __init__.py
    │   ├── auth.py
    │   ├── battery.py
    │   ├── bluetooth.py
    │   ├── gpio.py
    │   ├── network.py
    │   └── system.py
    ├── static/
    │   ├── css/
    │   │    └── style.css
    │   ├── img/
    │   └── js/
    │       ├── battery.js
    │       ├── bluetooth.js
    │       ├── gauges.js
    │       ├── gpio.js
    │       ├── list.js
    │       ├── main.js
    │       ├── network.js
    │       ├── status.js
    │       └── utils.js
    ├── templates/
    │   ├── index.html
    │   └── login.html
    └── utils/
        ├── __init__.py
        ├── gpio_helpers.py
        └── __pycache__/

---

## 📦 Dépendances

* NeoBerry s'appuie sur les bibliothèques Python suivantes :

- Flask — Framework web léger pour créer l’interface et les endpoints backend

- RPi.GPIO — Contrôle bas niveau des broches GPIO du Raspberry Pi (utilisé dans le cœur du projet)

- psutil — Surveillance des ressources système : CPU, RAM, température, réseau

- requests — Requêtes HTTP simples pour interroger des APIs ou des services externes

- gunicorn — Serveur WSGI rapide et robuste, utilisé en production avec Flask

- python-dotenv — Chargement des variables d’environnement depuis un fichier .env (clé secrète, config)

- Werkzeug — Outils de routage et session utilisés par Flask

- Click / ItsDangerous / MarkupSafe — Dépendances indirectes de Flask, utiles pour les CLI, la sécurité et le templating

---

## 🚀 Installation

### 🔧 1.1 Installation manuelle (Environnement hors Raspberry Pi - mode DEV)

```bash
git clone https://github.com/D-Goth/NeoBerry.git
cd NeoBerry
sudo apt install python3-flask python3-gpiozero python3-psutil python3-requests python3-werkzeug python3-gunicorn 
python3.13 app/app.py

````
---

> Accédez ensuite à l'interface via :
> [http://localhost:5000](http://localhost:5000)

### 🔧 1.2 Installation manuelle (Environnement Raspberry Pi - mode PROD)

```bash
git clone https://github.com/D-Goth/NeoBerry.git
cd NeoBerry
sudo ./install_neoBerry.sh

````

* ✅ Test lancement avec Gunicorn [Optionnel]
```bash
cd app
gunicorn --bind 0.0.0.0:5000 app:app

````
* Utilisation du script run_neoBerry.sh

### Démarrer NeoBerry
```bash
./run_neoBerry.sh --start

````

### Arrêter NeoBerry
```bash
./run_neoBerry.sh --stop

````

### Redémarrer NeoBerry
```bash
./run_neoBerry.sh --restart

````

### Vérifier l'état de l'application
```bash
./run_neoBerry.sh --status

````

* Créer un service systemd → auto au démarrage

```bash
sudo cp neoBerry.service /etc/systemd/system/flask-dashboard.service
sudo systemctl enable flask-dashboard
sudo systemctl start flask-dashboard

````


> Accédez ensuite à l'interface via :
> [http://localhost:5000](http://localhost:5000)

---

### 🧪 2. Mode Test (hors Raspberry Pi)

NeoBerry peut être exécuté sur un environnement de test sans Raspberry Pi en activant le mode simulation des GPIO.

* : Créer et activer un environnement virtuel

```bash
sudo apt install python3.13-venv
python3.13 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app/app.py

```

> L'application détectera automatiquement qu'elle ne tourne pas sur un Raspberry Pi et activera le mode simulation sur les broches GPIO.

---

## 🧰 Utilisation

* Se connecter avec un login Linux via l'interface web
* Visualiser et contrôler les GPIO du Raspberry Pi (ou en mode simulation)
* Surveiller les métriques système et réseau
* Redémarrer ou éteindre le Raspberry Pi via les boutons sécurisés

---

## 📄 Licence

Voir le fichier `LICENSE`.

---

## 🔗 Liens utiles

* [Page GitHub](https://github.com/D-Goth/NeoBerry)
* [Black-Lab](https://www.black-lab.fr)

---

# NeoBerry GPIO Control - 🇬🇧

**NeoBerry GPIO Control** is a web application that allows monitoring and controlling a Raspberry Pi's GPIO pins through a modern and responsive interface.

---

## ✨ Features

- Intuitive and responsive web interface  
- Display and control of GPIO pins  
- System performance monitoring (CPU, RAM, temperature, network)  
- Secure management via login with PAM authentication  
- Reboot and shutdown buttons (protected)  
- Test mode without Raspberry Pi with GPIO simulation  

---
![NeoBerry](https://img.shields.io/badge/🍓-NeoBerry-red)
![Python](https://img.shields.io/badge/python-3.13-blue)
![JavaScript](https://img.shields.io/badge/javascript-ES6-yellow)
![HTML](https://img.shields.io/badge/html-5-orange)
![CSS](https://img.shields.io/badge/css-3-blueviolet)
![Flask](https://img.shields.io/badge/flask-2.3-lightgrey)
![PAM](https://img.shields.io/badge/authentication-PAM-critical)
![GPIO](https://img.shields.io/badge/RPi-GPIO-brightgreen)
![BLE](https://img.shields.io/badge/Bluetooth-LE-00599e)
![Licence](https://img.shields.io/badge/licence-MIT-green)

---

## Structure

NeoBerry/
├── LICENSE
├── NeoBerryTree.txt
├── README.txt
├── run_neoBerry.sh
├── install_neoBerry.sh
└── app/
    ├── app.py
    ├── core/
    │   ├── __init__.py
    │   ├── auth.py
    │   ├── battery.py
    │   ├── bluetooth.py
    │   ├── gpio.py
    │   ├── network.py
    │   └── system.py
    ├── static/
    │   ├── css/
    │   │    └── style.css
    │   ├── img/
    │   └── js/
    │       ├── battery.js
    │       ├── bluetooth.js
    │       ├── gauges.js
    │       ├── gpio.js
    │       ├── list.js
    │       ├── main.js
    │       ├── network.js
    │       ├── status.js
    │       └── utils.js
    ├── templates/
    │   ├── index.html
    │   └── login.html
    └── utils/
        ├── __init__.py
        ├── gpio_helpers.py
        └── __pycache__/

---

## 📦 Dependencies

* NeoBerry relies on the following Python libraries:

- Flask — Lightweight web framework for creating the interface and backend endpoints  
- RPi.GPIO — Low-level control of Raspberry Pi GPIO pins (used in the project core)  
- psutil — System resource monitoring: CPU, RAM, temperature, network  
- requests — Simple HTTP requests to query APIs or external services  
- gunicorn — Fast and robust WSGI server, used in production with Flask  
- python-dotenv — Loading environment variables from a .env file (secret key, config)  
- Werkzeug — Routing and session tools used by Flask  
- Click / ItsDangerous / MarkupSafe — Indirect Flask dependencies, useful for CLI, security, and templating  

---

## 🚀 Installation

### 🔧 1.1 Manual Installation (Non-Raspberry Pi Environment - DEV Mode)

```bash
git clone https://github.com/D-Goth/NeoBerry.git
cd NeoBerry
sudo apt install python3-flask python3-gpiozero python3-psutil python3-requests python3-werkzeug python3-gunicorn 
python3.13 app/app.py
```

> Then access the interface at:  
> [http://localhost:5000](http://localhost:5000)

### 🔧 1.2 Manual Installation (Raspberry Pi Environment - PROD Mode)

```bash
git clone https://github.com/D-Goth/NeoBerry.git
cd NeoBerry
sudo ./install_neoBerry.sh

```

* ✅ Test launch with Gunicorn [Optional]
```bash 
  cd app  
  gunicorn --bind 0.0.0.0:5000 app:app  
```

* Using the run_neoBerry.sh script  

### Start NeoBerry  
```bash
./run_neoBerry.sh --start

````

### Stop NeoBerry  
```bash
./run_neoBerry.sh --stop

```` 

### Restart NeoBerry  
```bash
./run_neoBerry.sh --restart

````  

### Check application status  
```bash
./run_neoBerry.sh --status

````  

* Create a systemd service → auto-start at boot  
```bash
sudo cp neoBerry.service /etc/systemd/system/flask-dashboard.service
sudo systemctl enable flask-dashboard
sudo systemctl start flask-dashboard

````

> Then access the interface at:  
> [http://localhost:5000](http://localhost:5000)

---

### 🧪 2. Test Mode (Without Raspberry Pi)

NeoBerry can be run in a test environment without a Raspberry Pi by enabling GPIO simulation mode.

* Create and activate a virtual environment  

```bash
sudo apt install python3.13-venv
python3.13 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app/app.py
```

> The application will automatically detect it’s not running on a Raspberry Pi and enable GPIO simulation mode.

---

## 🧰 Usage

* Log in with a Linux account via the web interface  
* View and control the Raspberry Pi’s GPIO pins (or in simulation mode)  
* Monitor system and network metrics  
* Reboot or shut down the Raspberry Pi using the secured buttons  

---

## 📄 License

See the `LICENSE` file.

---

## 🔗 Useful Links

* [GitHub Page](https://github.com/D-Goth/NeoBerry)  
* [Black-Lab](https://www.black-lab.fr)  

---
