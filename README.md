NeoBerry
NeoBerry permet de contrôler les broches GPIO des Raspberry Pi (y compris Pi 5) via une interface web utilisant Flask, Bootstrap 5, et Chart.js. Il inclut des indicateurs LED avec animation clignotante pour l’activité, des interrupteurs pour un contrôle à distance, et des gauges modernes avec un dégradé circulaire (bleu à rouge) pour les capteurs système.

Fonctionnalités

Contrôle des GPIO (broches 2 à 27) en deux rangées de 14, avec LEDs et interrupteurs
Indicateurs LED (vert pour HIGH, rouge pour LOW) avec clignotement basé sur l’activité
Interrupteurs pour activer/désactiver chaque broche à distance (via AJAX)
Visualisation des états GPIO avec un graphique Chart.js
Gauges modernes avec dégradé bleu->cyan->turquoise->vert->jaune->orange->rouge pour : température carte/CPU, % CPU, % RAM, vitesse ventilateur, mises à jour en temps réel (500ms) avec transitions fluides
Contrôle de la vitesse du ventilateur via PWM (GPIO 18)
Compatibilité avec Raspberry Pi OS (Debian Bookworm) et Python 3.11
Mode simulation pour tester sans matériel
Déploiement conteneurisé avec Docker

Prérequis

Raspberry Pi (4 ou 5) avec Raspberry Pi OS (optionnel pour les tests)
Python 3.11 et pip
Docker et Docker Compose (optionnel)
Ventilateur PWM connecté à GPIO 18 (optionnel)

Installation sans Docker

Clonez le dépôt :
git clone https://github.com/D-Goth/NeoBerry.git

cd NeoBerry


Installez les dépendances :pip install -r requirements.txt


Lancez l’application :python app/main.py


Ouvrez http://<IP>:5000 dans un navigateur.

Installation avec Docker

Assurez-vous que Docker est installé :sudo apt install docker.io docker-compose


Lancez le conteneur :docker-compose up --build


Ouvrez http://<IP>:5000.

Configuration

Les broches GPIO (2 à 27) sont gérées dans app/gpio_interface.py.
Le ventilateur est contrôlé via PWM sur GPIO 18.
Les métriques système et l’animation clignotante sont mises à jour toutes les 500 ms.
Mode simulation activé automatiquement si RPi.GPIO n’est pas disponible.

Contribution
Ouvrez une issue ou soumettez une pull request sur GitHub.
Crédits
Basé sur BerryIO de NeonHorizon.
Licence
Ce projet est sous licence GPLv3. Voir le fichier LICENSE.
