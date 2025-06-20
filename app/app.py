import os
import platform
import subprocess
import threading
from flask import (
    Flask,
    jsonify,
    request,
    render_template,
    redirect,
    url_for,
    session,
    abort,
    Response,
    flash,
)
import psutil
import time
from functools import wraps
import logging
import json
import secrets
import re

from dotenv import load_dotenv

load_dotenv()

try:
    import RPi.GPIO as GPIO

    IS_RPI = True
except (ImportError, RuntimeError):
    IS_RPI = False
try:
    import pam

    PAM_AVAILABLE = True
    p = pam.pam()
except ImportError:
    PAM_AVAILABLE = False
    p = None
app = Flask(__name__)
secret_key = os.getenv("FLASK_SECRET_KEY")

if not secret_key:
    print("⚠️ Aucune clé FLASK_SECRET_KEY trouvée, génération d'une nouvelle clé...")
    secret_key = secrets.token_hex(32)

    with open(".env", "a") as f:
        f.write(f"\nFLASK_SECRET_KEY={secret_key}\n")
app.secret_key = secret_key

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logging.getLogger("werkzeug").setLevel(logging.WARNING)


def async_reboot():
    import time

    time.sleep(2)
    os.system("sudo reboot")


def async_shutdown():
    import time

    time.sleep(2)
    os.system("sudo shutdown now")


GPIO_PINS = list(range(1, 41))
gpio_states = {pin: False for pin in GPIO_PINS}

# Initialisation des GPIO

if IS_RPI:
    GPIO.setmode(GPIO.BCM)
    for pin in GPIO_PINS:
        try:
            GPIO.setup(pin, GPIO.OUT)
            GPIO.output(pin, GPIO.LOW)
            gpio_states[pin] = False
        except Exception as e:
            logger.warning(f"GPIO setup failed for pin {pin}: {e}")


def is_raspberry_pi():
    uname_info = platform.uname()
    return (
        IS_RPI
        or "raspberrypi" in uname_info.system.lower()
        or "raspberrypi" in uname_info.release.lower()
    )


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("logged_in"):
            return redirect(url_for("login", next=request.url))
        return f(*args, **kwargs)

    return decorated


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")
        if PAM_AVAILABLE:
            if p.authenticate(username, password):
                session["logged_in"] = True
                session["username"] = username
                next_url = request.args.get("next")
                return redirect(next_url or url_for("index"))
            else:
                flash("Nom utilisateur ou mot de passe incorrect.", "error")
        else:
            session["logged_in"] = True
            session["username"] = username
            next_url = request.args.get("next")
            return redirect(next_url or url_for("index"))
    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


def write_gpio(pin, state):
    if pin not in GPIO_PINS:
        raise ValueError("Pin invalide")
    if is_raspberry_pi():
        try:
            GPIO.output(pin, GPIO.HIGH if state else GPIO.LOW)
            gpio_states[pin] = state
        except Exception as e:
            logger.error(f"Erreur écriture GPIO {pin}: {e}")
    else:
        gpio_states[pin] = state


def read_gpio(pin):
    if pin not in GPIO_PINS:
        raise ValueError("Pin invalide")
    if is_raspberry_pi():
        try:
            val = GPIO.input(pin)
            gpio_states[pin] = bool(val)
            return bool(val)
        except Exception as e:
            logger.error(f"Erreur lecture GPIO {pin}: {e}")
            return False
    else:
        return gpio_states.get(pin, False)


@app.route("/")
@login_required
def index():
    return render_template("index.html")


last_counters = psutil.net_io_counters()
last_time = time.time()


def get_network_metrics():
    global last_counters, last_time
    current_counters = psutil.net_io_counters()
    current_time = time.time()
    elapsed_time = current_time - last_time

    if elapsed_time > 0:
        upload_speed = (
            current_counters.bytes_sent - last_counters.bytes_sent
        ) / elapsed_time
        download_speed = (
            current_counters.bytes_recv - last_counters.bytes_recv
        ) / elapsed_time
    else:
        upload_speed, download_speed = 0, 0
    last_counters = current_counters
    last_time = current_time

    return {
        "network_up": convert_bytes(upload_speed) + "/s",
        "network_down": convert_bytes(download_speed) + "/s",
    }


def convert_bytes(bytes_val):
    """Convertit une valeur en Bytes vers KB, MB ou GB"""
    if bytes_val < 1:
        return "0 B/s"
    units = ["B", "KB", "MB", "GB"]
    index = 0
    while bytes_val >= 1024 and index < len(units) - 1:
        bytes_val /= 1024
        index += 1
    return f"{bytes_val:.2f} {units[index]}"


@app.route("/api/network", methods=["GET"])
@login_required
def api_network():
    """Récupère les vitesses réseau (Upload/Download uniquement)"""
    try:
        network_metrics = get_network_metrics()
        return jsonify({"metrics": network_metrics})
    except Exception as e:
        logging.error(f"Erreur API /api/network: {e}")
        return jsonify({"error": "Erreur interne serveur"}), 500


@app.route("/api/status", methods=["GET"])
@login_required
def api_status():
    try:
        cpu_load = round(psutil.cpu_percent(interval=0.5))
        ram_load = psutil.virtual_memory().percent

        cpu_temp = 0
        board_temp = 0
        if is_raspberry_pi():
            try:
                out = subprocess.check_output(["vcgencmd", "measure_temp"]).decode()
                cpu_temp = float(out.strip().split("=")[1].replace("'C", ""))
            except Exception:
                cpu_temp = 45.0
            board_temp = cpu_temp - 5 if cpu_temp > 10 else 40
        else:
            temps = psutil.sensors_temperatures()
            if temps:
                for name, entries in temps.items():
                    if entries:
                        cpu_temp = max(cpu_temp, entries[0].current)
                board_temp = cpu_temp
            else:
                cpu_temp = 42.0
                board_temp = 38.0
        disk_usage = psutil.disk_usage("/")
        disk_capacity_percent = disk_usage.percent

        disk_io = psutil.disk_io_counters()
        disk_read_percent = min(100, (disk_io.read_bytes / (1024 * 1024 * 1024)) * 10)
        disk_write_percent = min(100, (disk_io.write_bytes / (1024 * 1024 * 1024)) * 10)

        network_metrics = get_network_metrics()

        network_info = {
            "bluetooth_enabled": False,
            "bluetooth_device": None,
            "bluetooth_quality": 0,
            "network_type": "Ethernet",
            "wifi_strength": 0,
            "wifi_ssid": None,
        }

        if platform.system() == "Linux":
            try:
                subprocess.run(
                    ["which", "iwgetid"],
                    check=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                )
                out = (
                    subprocess.check_output("iwgetid -r", shell=True)
                    .decode("utf-8")
                    .strip()
                )
                if out:
                    network_info["wifi_ssid"] = out
                    network_info["network_type"] = "WiFi"
                    network_info["wifi_strength"] = 70
            except subprocess.CalledProcessError:
                pass
            except Exception as e:
                logger.error(f"Erreur lors de la récupération du SSID WiFi: {e}")
        gpio_data = {pin: read_gpio(pin) for pin in GPIO_PINS}

        return jsonify(
            {
                "cpu_load": cpu_load,
                "ram_load": ram_load,
                "cpu_temp": round(cpu_temp, 1),
                "board_temp": round(board_temp, 1),
                "disk_capacity_percent": round(disk_capacity_percent, 1),
                "disk_read_percent": round(disk_read_percent, 1),
                "disk_write_percent": round(disk_write_percent, 1),
                "bluetooth": {
                    "enabled": network_info["bluetooth_enabled"],
                    "device": network_info["bluetooth_device"],
                    "quality": network_info["bluetooth_quality"],
                },
                "network": {
                    "type": network_info["network_type"],
                    "wifi_strength": network_info["wifi_strength"],
                    "wifi_ssid": network_info["wifi_ssid"],
                },
                "gpio_states": gpio_data,
            }
        )
    except Exception as e:
        logging.error(f"Erreur API /api/status: {e}")
        return jsonify({"error": "Erreur interne serveur"}), 500


@app.route("/api/gpio", methods=["GET"])
@login_required
def api_gpio_get():
    try:
        gpio_data = {pin: read_gpio(pin) for pin in GPIO_PINS}
        return jsonify(gpio_data)
    except Exception as e:
        logger.error(f"Erreur API /api/gpio GET: {e}")
        return jsonify({"error": "Erreur serveur"}), 500


@app.route("/api/gpio", methods=["POST"])
@login_required
def api_gpio_post():
    if not request.is_json:
        return jsonify({"error": "JSON requis"}), 400
    content = request.get_json()
    pin = content.get("pin")
    state = content.get("state")
    if not isinstance(pin, int) or not isinstance(state, bool):
        return jsonify({"error": "Données invalides"}), 400
    if pin not in GPIO_PINS:
        return jsonify({"error": "Pin invalide"}), 400
    try:
        write_gpio(pin, state)
        return jsonify({"pin": pin, "state": state, "success": True})
    except Exception as e:
        logger.error(f"Erreur écriture GPIO {pin}: {e}")
        return jsonify({"error": "Erreur serveur"}), 500


def run_cmd(cmd):
    return subprocess.run(
        cmd, shell=True, capture_output=True, text=True
    ).stdout.strip()


@app.route("/api/reboot", methods=["POST"])
@login_required
def api_reboot():
    threading.Thread(target=async_reboot).start()
    return jsonify({"message": "Redémarrage en cours..."})


@app.route("/api/shutdown", methods=["POST"])
@login_required
def api_shutdown():
    threading.Thread(target=async_shutdown).start()
    return jsonify({"message": "Extinction en cours..."})


@app.route("/bluetooth/on", methods=["POST"])
@login_required
def bluetooth_on():
    run_cmd("rfkill unblock bluetooth")
    run_cmd("bluetoothctl power on")
    return jsonify({"status": "on"})


@app.route("/bluetooth/off", methods=["POST"])
@login_required
def bluetooth_off():
    run_cmd("bluetoothctl power off")
    return jsonify({"status": "off"})


@app.route("/bluetooth/scan", methods=["GET"])
@login_required
def bluetooth_scan():
    run_cmd("bluetoothctl scan on")
    output = run_cmd("timeout 5s bluetoothctl devices")
    devices = []
    for line in output.splitlines():
        match = re.match(r"Device ([0-9A-F:]+) (.+)", line)
        if match:
            addr, name = match.groups()
            devices.append({"address": addr, "name": name})
    run_cmd("bluetoothctl scan off")
    return jsonify(devices)


@app.route("/bluetooth/pair", methods=["POST"])
@login_required
def bluetooth_pair():
    data = request.get_json()
    address = data.get("address")
    output = run_cmd(f"bluetoothctl pair {address}")
    return jsonify({"result": output})


@app.route("/bluetooth/connect", methods=["POST"])
@login_required
def bluetooth_connect():
    data = request.get_json()
    address = data.get("address")
    output = run_cmd(f"bluetoothctl connect {address}")
    return jsonify({"result": output})


@app.route("/bluetooth/trusted", methods=["POST"])
@login_required
def bluetooth_trust():
    data = request.get_json()
    address = data.get("address")
    run_cmd(f"bluetoothctl trust {address}")
    return jsonify({"status": "trusted"})


@app.route("/bluetooth/remove", methods=["POST"])
@login_required
def bluetooth_remove():
    data = request.get_json()
    address = data.get("address")
    output = run_cmd(f"bluetoothctl remove {address}")
    return jsonify({"result": output})


@app.route("/bluetooth/paired", methods=["GET"])
@login_required
def bluetooth_paired():
    output = run_cmd("bluetoothctl paired-devices")
    devices = []
    for line in output.splitlines():
        match = re.match(r"Device ([0-9A-F:]+) (.+)", line)
        if match:
            addr, name = match.groups()
            devices.append({"address": addr, "name": name})
    return jsonify(devices)


@app.route("/bluetooth/signal", methods=["POST"])
@login_required
def bluetooth_signal():
    address = request.get_json().get("address")
    output = run_cmd(f"hcitool rssi {address}")
    match = re.search(r"RSSI return value:\s*(-?\d+)", output)
    if match:
        rssi = int(match.group(1))
        quality = min(
            max(int((rssi + 100) * 1.25), 0), 100
        )  # convert RSSI to 0-100 scale
    else:
        quality = 0
    return jsonify({"rssi": rssi if match else None, "quality": quality})


@app.route("/api/bluetooth/status")
@login_required
def get_bluetooth_status():
    # Simulez la récupération de la qualité de la connexion Bluetooth

    quality = 75  # Exemple de valeur de qualité (0 à 100)
    connected_device = "Bose QC35"  # Exemple de périphérique connecté

    return jsonify({"quality": quality, "device": connected_device})


@app.route("/api/battery")
@login_required
def battery_status():
    try:
        # Tentative avec psutil

        battery = psutil.sensors_battery()
        if battery is not None:
            percent = battery.percent
            power_plugged = battery.power_plugged
            secsleft = (
                battery.secsleft
                if battery.secsleft != psutil.POWER_TIME_UNKNOWN
                else None
            )
        else:
            # Fallback avec upower si psutil échoue

            try:
                output = check_output(["upower", "-e"]).decode().strip()
                if (
                    "battery" in output or "device" in output
                ):  # Cherche un périphérique batterie
                    device = output.split()[-1]
                    percent = float(
                        check_output(
                            ["upower", "-i", device, "| grep percentage"], text=True
                        )
                        .split()[-1]
                        .rstrip("%")
                    )
                    state = check_output(
                        ["upower", "-i", device, "| grep state"], text=True
                    ).split()[-1]
                    power_plugged = state == "charging" or state == "fully-charged"
                    secsleft = None  # upower ne donne pas toujours le temps restant
                else:
                    percent = 100  # Par défaut à 100% si rien détecté
                    power_plugged = True
                    secsleft = None
                    print("No battery detected, defaulting to 100%")
            except (CalledProcessError, ValueError, IndexError) as e:
                percent = 100  # Par défaut à 100% si erreur
                power_plugged = True
                secsleft = None
                print(f"Error with upower: {e}")
        return jsonify(
            {
                "percent": percent,
                "power_plugged": power_plugged,
                "secsleft": secsleft,
                "no_battery_detected": percent == 100
                and not battery,  # Indique si c'est par défaut
            }
        )
    except Exception as e:
        return jsonify(
            {
                "error": str(e),
                "percent": 100,
                "power_plugged": True,
                "secsleft": None,
                "no_battery_detected": True,
            }
        )


from flask import request

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)

