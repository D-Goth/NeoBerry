from flask import Blueprint, jsonify, session
from functools import wraps
import psutil
import time

network_bp = Blueprint("network", __name__)

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("logged_in"):
            return jsonify({"error": "Authentification requise"}), 401
        return f(*args, **kwargs)
    return decorated

# Mémoire locale pour débit
last_counters = psutil.net_io_counters()
last_time = time.time()

def convert_bytes(bytes_val):
    if bytes_val < 1:
        return "0 B/s"
    units = ["B", "KB", "MB", "GB"]
    index = 0
    while bytes_val >= 1024 and index < len(units) - 1:
        bytes_val /= 1024
        index += 1
    return f"{bytes_val:.2f} {units[index]}"

def get_network_metrics():
    global last_counters, last_time
    current_counters = psutil.net_io_counters()
    now = time.time()
    elapsed = now - last_time

    if elapsed == 0:
        return {"network_up": "0 B/s", "network_down": "0 B/s"}

    upload = (current_counters.bytes_sent - last_counters.bytes_sent) / elapsed
    download = (current_counters.bytes_recv - last_counters.bytes_recv) / elapsed

    last_counters = current_counters
    last_time = now

    return {
        "network_up": convert_bytes(upload) + "/s",
        "network_down": convert_bytes(download) + "/s",
    }

@network_bp.route("/api/network", methods=["GET"])
@login_required
def api_network():
    try:
        metrics = get_network_metrics()
        return jsonify({"metrics": metrics})
    except Exception as e:
        return jsonify({"error": "Erreur lors de la récupération réseau"}), 500

