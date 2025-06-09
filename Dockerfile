# Utilisation de Python officiel
FROM python:3.13

# Définir le dossier de travail
WORKDIR /app

# Copier les fichiers du projet
COPY . /app

# Installer les dépendances
RUN pip install -r requirements.txt

# Exposer le port 5000
EXPOSE 5000

# Commande de démarrage
CMD ["python", "app.py"]

