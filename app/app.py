import os
import secrets
import logging
from flask import Flask
from dotenv import load_dotenv

# Chargement des variables d'environnement (.env)
load_dotenv()

app = Flask(__name__)

# Configuration de la clé secrète Flask
secret_key = os.getenv("FLASK_SECRET_KEY")
if not secret_key:
    print("⚠️ Aucune clé FLASK_SECRET_KEY trouvée, génération automatique...")
    secret_key = secrets.token_hex(32)
    with open(".env", "a") as f:
        f.write(f"\nFLASK_SECRET_KEY={secret_key}\n")
app.secret_key = secret_key

# Configuration logging
logging.basicConfig(level=logging.INFO)
logging.getLogger("werkzeug").setLevel(logging.WARNING)

# Import des Blueprints
from core.auth import auth_bp
from core.battery import battery_bp
from core.bluetooth import bluetooth_bp
from core.infosys import infosys_bp
from core.graph import graph_bp
from core.gpio import gpio_bp
from core.network import network_bp, start_network_logger
from core.system import system_bp
from core.voltage import voltage_bp, start_voltage_logger

# 💡 Lancement des threads auto-collecteurs
start_network_logger()
start_voltage_logger()

# Enregistrement des Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(battery_bp)
app.register_blueprint(bluetooth_bp)
app.register_blueprint(infosys_bp)
app.register_blueprint(graph_bp)
app.register_blueprint(gpio_bp)
app.register_blueprint(network_bp)
app.register_blueprint(system_bp)
app.register_blueprint(voltage_bp)

# Route racine protégée
from flask import render_template, session, redirect, url_for

@app.route("/")
def index():
    if not session.get("logged_in"):
        return redirect(url_for("auth.login"))
    return render_template("index.html")

# Lancement de l'application
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
