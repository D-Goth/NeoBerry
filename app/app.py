import os
import platform
import subprocess
import threading
from flask import Flask, jsonify, request, render_template, redirect, url_for, session, abort, Response, flash
import psutil
from functools import wraps
import logging

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
app.secret_key = os.urandom(24)  # Needed for sessions

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

# Paramètres du ventilateur
fan_gpio_pin = 18
fan_speed = 0

def is_raspberry_pi():
    uname_info = platform.uname()
    return IS_RPI or 'raspberrypi' in uname_info.system.lower() or 'raspberrypi' in uname_info.release.lower()

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

        fan_rpm = 1200  # Placeholder, peut être amélioré avec une mesure réelle si disponible

        disk_usage = psutil.disk_usage("/")
        disk_capacity_percent = disk_usage.percent

        disk_io = psutil.disk_io_counters()
        disk_read_percent = min(100, (disk_io.read_bytes / (1024 * 1024 * 1024)) * 10)
        disk_write_percent = min(100, (disk_io.write_bytes / (1024 * 1024 * 1024)) * 10)

        network_info = {
            "bluetooth_enabled": False,
            "bluetooth_device": None,
            "bluetooth_quality": 0,
            "network_type": "Ethernet",
            "upload_speed": 0,
            "download_speed": 0,
            "wifi_strength": 0,
            "wifi_ssid": None,
        }

        if platform.system() == "Linux":
            try:
                subprocess.run(["which", "iwgetid"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                out = subprocess.check_output("iwgetid -r", shell=True).decode("utf-8").strip()
                if out:
                    network_info["wifi_ssid"] = out
                    network_info["network_type"] = "WiFi"
                    network_info["wifi_strength"] = 70
            except subprocess.CalledProcessError:
                logger.warning("iwgetid n'est pas disponible sur ce système.")
            except Exception as e:
                logger.error(f"Erreur lors de la récupération du SSID WiFi: {e}")

        gpio_data = {pin: read_gpio(pin) for pin in GPIO_PINS}

        return jsonify(
            {
                "cpu_load": cpu_load,
                "ram_load": ram_load,
                "cpu_temp": round(cpu_temp, 1),
                "board_temp": round(board_temp, 1),
                "fan_rpm": fan_rpm,
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
                    "upload_speed": network_info["upload_speed"],
                    "download_speed": network_info["download_speed"],
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

@app.route("/api/fan_settings", methods=["GET"])
@login_required
def get_fan_settings():
    return jsonify({'gpio_pin': fan_gpio_pin, 'speed': fan_speed})

@app.route("/api/fan_gpio", methods=["POST"])
@login_required
def set_fan_gpio():
    global fan_gpio_pin
    data = request.get_json()
    pin = data.get("gpio_pin")
    if isinstance(pin, int) and pin in GPIO_PINS:
        fan_gpio_pin = pin
        # Ici, vous pouvez gérer le changement effectif de pin ventilateur si nécessaire
        return jsonify({'success': True, 'gpio_pin': fan_gpio_pin})
    return jsonify({'success': False, 'error': 'GPIO invalide'}), 400

@app.route("/api/fan_speed", methods=["POST"])
@login_required
def set_fan_speed():
    global fan_speed
    data = request.get_json()
    speed = data.get("speed")
    if isinstance(speed, int) and 0 <= speed <= 100:
        fan_speed = speed
        if IS_RPI:
            try:
                # Ici, vous pouvez envoyer le signal PWM au ventilateur
                pass  # Remplacez par votre logique de contrôle PWM
            except Exception as e:
                logger.error(f"Erreur contrôle ventilateur PWM: {e}")
        return jsonify({'success': True, 'speed': fan_speed})
    return jsonify({'success': False, 'error': 'Vitesse invalide'}), 400

def async_reboot():
    import time
    time.sleep(2)
    os.system("sudo reboot")

def async_shutdown():
    import time
    time.sleep(2)
    os.system("sudo shutdown now")

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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)

