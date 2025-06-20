from flask import Blueprint, jsonify, request, session
from functools import wraps
import logging

from utils.gpio_helpers import read_gpio, write_gpio, GPIO_PINS

gpio_bp = Blueprint('gpio', __name__)

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("logged_in"):
            return jsonify({"error": "Authentification requise"}), 401
        return f(*args, **kwargs)
    return decorated

@gpio_bp.route("/api/gpio", methods=["GET"])
@login_required
def api_gpio_get():
    try:
        gpio_data = {pin: read_gpio(pin) for pin in GPIO_PINS}
        return jsonify({
            "states": gpio_data,
            "available_pins": GPIO_PINS
        })
    except Exception as e:
        logging.error(f"Erreur API /api/gpio GET: {e}")
        return jsonify({"error": "Erreur serveur"}), 500

@gpio_bp.route("/api/gpio", methods=["POST"])
@login_required
def api_gpio_post():
    if not request.is_json:
        return jsonify({"error": "JSON requis"}), 400
    data = request.get_json()
    pin = data.get("pin")
    state = data.get("state")
    if not isinstance(pin, int) or not isinstance(state, bool):
        return jsonify({"error": "Données invalides"}), 400
    if pin not in GPIO_PINS:
        return jsonify({"error": f"Pin {pin} non autorisé"}), 400
    try:
        write_gpio(pin, state)
        return jsonify({"pin": pin, "state": state, "success": True})
    except Exception as e:
        logging.error(f"Erreur écriture GPIO {pin}: {e}")
        return jsonify({"error": "Erreur serveur"}), 500

