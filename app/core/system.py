from flask import Blueprint, jsonify, session, request
from functools import wraps
import subprocess
import platform
import psutil
import logging
import time

from utils.gpio_helpers import read_gpio, GPIO_PINS, is_raspberry_pi
from core import auth  # utilisé pour vérifier le mot de passe de l'utilisateur

system_bp = Blueprint("system", __name__)

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("logged_in"):
            return jsonify({"error": "Authentification requise"}), 401
        return f(*args, **kwargs)
    return decorated

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
    current_time = time.time()
    elapsed = current_time - last_time
    if elapsed == 0:
        return {"network_up": "0 B/s", "network_down": "0 B/s"}
    upload = (current_counters.bytes_sent - last_counters.bytes_sent) / elapsed
    download = (current_counters.bytes_recv - last_counters.bytes_recv) / elapsed
    last_counters = current_counters
    last_time = current_time
    return {
        "network_up": convert_bytes(upload) + "/s",
        "network_down": convert_bytes(download) + "/s",
    }

@system_bp.route("/api/network", methods=["GET"])
@login_required
def api_network():
    try:
        metrics = get_network_metrics()
        return jsonify({"metrics": metrics})
    except Exception as e:
        logging.error(f"Erreur API /api/network: {e}")
        return jsonify({"error": "Erreur interne serveur"}), 500

@system_bp.route("/api/status", methods=["GET"])
@login_required
def api_status():
    try:
        cpu_load = round(psutil.cpu_percent(interval=0.5))
        ram_load = psutil.virtual_memory().percent

        cpu_temp = 0
        board_temp = 0
        if is_raspberry_pi():
            try:
                output = subprocess.check_output(["vcgencmd", "measure_temp"]).decode()
                cpu_temp = float(output.strip().split("=")[1].replace("'C", ""))
            except Exception:
                cpu_temp = 45.0
            board_temp = cpu_temp - 5 if cpu_temp > 10 else 40
        else:
            temps = psutil.sensors_temperatures()
            if temps:
                for entries in temps.values():
                    if entries:
                        cpu_temp = max(cpu_temp, entries[0].current)
                board_temp = cpu_temp
            else:
                cpu_temp = 42.0
                board_temp = 38.0

        disk_usage = psutil.disk_usage("/")
        disk_capacity = disk_usage.percent

        disk_io = psutil.disk_io_counters()
        disk_read = min(100, (disk_io.read_bytes / (1024**3)) * 10)
        disk_write = min(100, (disk_io.write_bytes / (1024**3)) * 10)

        net_metrics = get_network_metrics()

        wifi_info = {
            "network_type": "Ethernet",
            "wifi_strength": 0,
            "wifi_ssid": None,
            "bluetooth_enabled": False,
            "bluetooth_device": None,
            "bluetooth_quality": 0,
        }

        if platform.system() == "Linux":
            try:
                subprocess.run(["which", "iwgetid"], check=True, stdout=subprocess.PIPE)
                ssid = subprocess.check_output("iwgetid -r", shell=True).decode().strip()
                if ssid:
                    wifi_info["wifi_ssid"] = ssid
                    wifi_info["network_type"] = "WiFi"
                    wifi_info["wifi_strength"] = 70
            except Exception:
                pass

        gpio_data = {pin: read_gpio(pin) for pin in GPIO_PINS}

        return jsonify({
            "cpu_load": cpu_load,
            "ram_load": ram_load,
            "cpu_temp": round(cpu_temp, 1),
            "board_temp": round(board_temp, 1),
            "disk_capacity_percent": round(disk_capacity, 1),
            "disk_read_percent": round(disk_read, 1),
            "disk_write_percent": round(disk_write, 1),
            "bluetooth": {
                "enabled": wifi_info["bluetooth_enabled"],
                "device": wifi_info["bluetooth_device"],
                "quality": wifi_info["bluetooth_quality"]
            },
            "network": {
                "type": wifi_info["network_type"],
                "wifi_strength": wifi_info["wifi_strength"],
                "wifi_ssid": wifi_info["wifi_ssid"]
            },
            "gpio_states": gpio_data
        })
    except Exception as e:
        logging.error(f"Erreur API /api/status: {e}")
        return jsonify({"error": "Erreur interne serveur"}), 500
        
@system_bp.route("/api/restart-neoberry", methods=["POST"])
@login_required
def restart_neoberry():
    try:
        subprocess.Popen(
            ["/bin/bash", "/chemin/vers/run_neoBerry.sh"],
            start_new_session=True
        )
        return jsonify(success=True)
    except Exception:
        return jsonify(success=False, error="Impossible de relancer NeoBerry."), 500

@system_bp.route("/api/reboot", methods=["POST"])
@login_required
def reboot_system():
    data = request.get_json()
    password = data.get("password", "")
    username = session.get("username")

    if not username or not password:
        return jsonify(success=False, error="Champs requis manquants."), 400

    if not auth.verify(password):
        return jsonify(success=False, error="Mot de passe incorrect."), 403

    try:
        subprocess.run(["sudo", "/usr/sbin/reboot"], check=True)
        return jsonify(success=True)
    except subprocess.CalledProcessError:
        return jsonify(success=False, error="Impossible de redémarrer le système."), 500


@system_bp.route("/api/shutdown", methods=["POST"])
@login_required
def api_shutdown():
    data = request.get_json()
    password = data.get("password", "")
    username = session.get("username")

    if not username or not password:
        return jsonify(success=False, error="Champs requis manquants."), 400

    if not auth.verify(password):
        return jsonify(success=False, error="Mot de passe incorrect."), 403

    try:
        subprocess.run(["sudo", "shutdown", "-h", "now"], check=True)
        return jsonify(success=True)
    except subprocess.CalledProcessError as e:
        logging.error(f"[SHUTDOWN] Erreur commande : {e.stderr}")
        return jsonify(success=False, error="Échec de l'arrêt."), 500


