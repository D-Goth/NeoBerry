# NeoBerry GPIO Control

NeoBerry GPIO Control est une application web permettant de surveiller et contrôler les GPIO d'un Raspberry Pi via une interface moderne et responsive.

## Fonctionnalités

- Interface web intuitive et responsive
- Affichage et contrôle des broches GPIO
- Surveillance des performances système (CPU, RAM, température, réseau)
- Gestion sécurisée via login avec authentification PAM
- Boutons de reboot et shutdown (protégés)
- Mode test hors Raspberry Pi avec simulation GPIO
- Déploiement via Docker pour une installation rapide

## Installation

### 1. Installation manuelle
```bash
git clone https://github.com/ton-repo/NeoBerry.git
cd NeoBerry
pip install -r requirements.txt
python app.py
Accédez ensuite à l'interface via http://localhost:5000.

2. Mode Test (hors Raspberry Pi)
NeoBerry peut être exécuté sur un environnement de test sans Raspberry Pi en activant le mode simulation des GPIO.

Étape 1 : Créer et activer un environnement virtuel
bash
python -m venv venv
source venv/bin/activate  # Sur Linux/macOS
venv\Scripts\activate      # Sur Windows
Étape 2 : Installer les dépendances
bash
pip install -r requirements.txt
Étape 3 : Lancer l'application en mode simulation
bash
python app.py
L'application détectera automatiquement qu'elle tourne hors Raspberry Pi et activera le mode simulation.

3. Déploiement via Docker
bash
docker-compose up -d

Utilisation
Se connecter avec un login Linux via l'interface web.

Visualiser et contrôler les GPIO du Raspberry Pi ou en mode simulation.

Surveiller les métriques système et réseau.

Redémarrer ou éteindre le Raspberry Pi via les boutons sécurisés.

Développement
Si vous souhaitez contribuer :

bash
git clone https://github.com/ton-repo/NeoBerry.git
cd NeoBerry
pip install -r requirements.txt
python app.py

License
Voir fichier LICENSE
