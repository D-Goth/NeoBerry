NeoBerry

NeoBerry est  conçu pour contrôler les broches GPIO des nouvelles Raspberry Pi (y compris la Pi 5) via une interface web. Il utilise Flask, Bootstrap 5, et supporte un déploiement via Docker.

Fonctionnalités





Contrôle des GPIO via une interface web responsive



Compatibilité avec Raspberry Pi OS (Debian Bookworm) et Python 3.11



Support des Raspberry Pi 4 et 5



Déploiement facile avec Docker

Prérequis





Raspberry Pi (4 ou 5) avec Raspberry Pi OS



Docker et Docker Compose (optionnel pour le déploiement conteneurisé)



Python 3.11 et pip

Installation





Clonez le dépôt :

git clone https://github.com/D-Goth/NeoBerry.git
cd NeoBerry



Installez les dépendances :

pip install -r requirements.txt



Lancez l’application :

python app/main.py



Ouvrez http://<IP-de-votre-Pi>:5000 dans un navigateur.

Déploiement avec Docker





Assurez-vous que Docker est installé :

sudo apt install docker.io docker-compose



Lancez le conteneur :

docker-compose up --build

Configuration





Les broches GPIO sont configurées dans app/gpio_interface.py.



Pour tester sans Raspberry Pi, activez le mode simulation dans gpio_interface.py.
