import os
import time
import psutil
import threading
from datetime import datetime
from flask import Blueprint, jsonify, session
from functools import wraps

network_bp = Blueprint("network", __name__)

# 📁 Chemin relatif vers logs/neoberry.log
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(BASE_DIR, '..', '..', 'logs', 'neoberry.log')

last_counters = psutil.net_io_counters()
last_time = time.time()

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("logged_in"):
            return jsonify({"error": "Authentification requise"}), 401
        return f(*args, **kwargs)
    return decorated

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

def log_network_metrics():
    metrics = get_network_metrics()
    try:
        down_val = float(metrics["network_down"].split()[0])
        up_val = float(metrics["network_up"].split()[0])
        now = datetime.now().strftime('%Y-%m-%d %H:%M')

        with open(LOG_PATH, 'a') as f:
            f.write(f"[{now}] net_down: {down_val}\n")
            f.write(f"[{now}] net_up: {up_val}\n")
    except Exception as e:
        print(f"⚠️ Erreur de log réseau : {e}")

def auto_log_loop():
    while True:
        log_network_metrics()
        time.sleep(60)

def start_network_logger():
    thread = threading.Thread(target=auto_log_loop, daemon=True)
    thread.start()

@network_bp.route("/api/network", methods=["GET"])
@login_required
def api_network():
    try:
        metrics = get_network_metrics()
        return jsonify({"metrics": metrics})
    except Exception:
        return jsonify({"error": "Erreur lors de la récupération réseau"}), 500

