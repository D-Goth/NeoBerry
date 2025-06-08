# NeoBerry

NeoBerry NeoBerry

NeoBerry est conçu pour contrôler les broches GPIO des nouvelles Raspberry Pi (y compris la Raspberry Pi 5) via une interface web moderne. Il utilise Flask pour le backend et Bootstrap 5 pour une interface responsive.

Fonctionnalités

Contrôle des GPIO via une interface web

Compatibilité avec Raspberry Pi OS (Debian Bookworm) et Python 3.9+

Interface utilisateur moderne et responsive

Support des nouvelles Raspberry Pi (Pi 4, Pi 5)

Installation

Clonez le dépôt :

git clone https://github.com/D-Goth/NeoBerry.git
cd NeoBerry

Installez les dépendances :

pip install -r requirements.txt

Lancez l’application :

python app.py

Ouvrez http://<IP-de-votre-Pi>:5000 dans un navigateur.

Configuration

Assurez-vous d’avoir une Raspberry Pi avec Raspberry Pi OS.

Vérifiez que les broches GPIO sont correctement configurées dans app.py.
