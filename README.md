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
- Déploiement via Docker pour une installation rapide  

---

## 🚀 Installation

### 🔧 1. Installation manuelle

```bash
git clone https://github.com/D-Goth/NeoBerry.git
cd NeoBerry
pip install -r requirements.txt
python app.py
````

> Accédez ensuite à l'interface via :
> [http://localhost:5000](http://localhost:5000)

---

### 🧪 2. Mode Test (hors Raspberry Pi)

NeoBerry peut être exécuté sur un environnement de test sans Raspberry Pi en activant le mode simulation des GPIO.

#### Étape 1 : Créer et activer un environnement virtuel

```bash
sudo apt install python3.12-venv
python -m venv venv
source venv/bin/activate      # Sur Linux/macOS
venv\Scripts\activate         # Sur Windows
```

#### Étape 2 : Installer les dépendances

```bash
pip install -r requirements.txt
```

#### Étape 3 : Lancer l'application en mode simulation

```bash
python app/app.py
```

> L'application détectera automatiquement qu'elle ne tourne pas sur un Raspberry Pi et activera le mode simulation.

---

### 🐳 3. Déploiement via Docker

```bash
docker-compose up -d
```

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

---

# NeoBerry GPIO Control - 🇬🇧

**NeoBerry GPIO Control** is a web application that allows you to monitor and control the GPIO pins of a Raspberry Pi through a modern and responsive interface.

---

## ✨ Features

- Intuitive and responsive web interface  
- Display and control of GPIO pins  
- System performance monitoring (CPU, RAM, temperature, network)  
- Secure login via PAM authentication  
- Protected reboot and shutdown buttons  
- Test mode available without a Raspberry Pi (GPIO simulation)  
- Docker deployment for fast and easy setup  

---

## 🚀 Installation

### 🔧 1. Manual Installation

```bash
git clone https://github.com/D-Goth/NeoBerry.git
cd NeoBerry
pip install -r requirements.txt
python app.py
````

> Then access the interface at:
> [http://localhost:5000](http://localhost:5000)

---

### 🧪 2. Test Mode (without Raspberry Pi)

NeoBerry can be run in a test environment without a Raspberry Pi by enabling the GPIO simulation mode.

#### Step 1: Create and activate a virtual environment

```bash
sudo apt install python3.12-venv
python -m venv venv
source venv/bin/activate      # On Linux/macOS
venv\Scripts\activate         # On Windows
```

#### Step 2: Install dependencies

```bash
pip install -r requirements.txt
```

#### Step 3: Launch the app in simulation mode

```bash
python app/app.py
```

> The app will automatically detect the absence of a Raspberry Pi and activate simulation mode.

---

### 🐳 3. Docker Deployment

```bash
docker-compose up -d
```

---

## 🧰 Usage

* Log in using your Linux user credentials via the web interface
* View and control GPIO pins on the Raspberry Pi or in simulation mode
* Monitor system and network metrics
* Securely reboot or shut down the Raspberry Pi using protected buttons

---

## 📄 License

See the `LICENSE` file.

---

## 🔗 Useful Links

* [GitHub Repository](https://github.com/D-Goth/NeoBerry)

```
