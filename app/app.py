"""
NeoBerry v2 — app.py
Flask + Flask-SocketIO backbone.
All real-time data is pushed via WebSocket events.
REST routes are kept only for actions (GPIO toggle, BT commands, system control).
"""

import os
import threading
import time
import logging
from flask import Flask, render_template, redirect, url_for, request, jsonify
from flask_login import LoginManager, login_required, current_user
from flask_socketio import SocketIO, emit

from core.auth import User, pam_authenticate
from core.gpio import GPIOManager
from core.system import SystemMonitor
from core.network import NetworkMonitor
from core.storage import StorageMonitor
from core.bluetooth import BluetoothManager

# ── App setup ────────────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")
log = logging.getLogger("neoberry")

app = Flask(__name__)
app.secret_key = os.environ.get("NEOBERRY_SECRET", os.urandom(32))

socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

login_manager = LoginManager(app)
login_manager.login_view = "login"

# ── Core services ─────────────────────────────────────────────────────────────

gpio    = GPIOManager()
system  = SystemMonitor()
network = NetworkMonitor()
storage = StorageMonitor()
bt      = BluetoothManager()

# ── Auth ──────────────────────────────────────────────────────────────────────

@login_manager.user_loader
def load_user(user_id):
    return User(user_id)


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        user, error = pam_authenticate(username, password)
        if user:
            from flask_login import login_user
            login_user(user)
            return redirect(url_for("dashboard"))
        return render_template("login.html", error=error)
    return render_template("login.html")


@app.route("/logout")
@login_required
def logout():
    from flask_login import logout_user
    logout_user()
    return redirect(url_for("login"))


@app.route("/")
@login_required
def dashboard():
    return render_template("index.html", username=current_user.id)


# ── GPIO REST API ─────────────────────────────────────────────────────────────

@app.route("/api/gpio/<int:pin>", methods=["POST"])
@login_required
def gpio_toggle(pin):
    data  = request.get_json(force=True)
    state = bool(data.get("state", False))
    result = gpio.set_pin(pin, state)
    socketio.emit("gpio_state", {"pin": pin, "state": state})
    return jsonify(result)


@app.route("/api/gpio/<int:pin>/mode", methods=["POST"])
@login_required
def gpio_mode(pin):
    data = request.get_json(force=True)
    mode = data.get("mode", "output")
    result = gpio.set_mode(pin, mode)
    return jsonify(result)


# ── Bluetooth REST API ────────────────────────────────────────────────────────

@app.route("/api/bluetooth/power", methods=["POST"])
@login_required
def bt_power():
    data = request.get_json(force=True)
    on   = bool(data.get("on", True))
    result = bt.set_power(on)
    return jsonify(result)


@app.route("/api/bluetooth/scan/start", methods=["POST"])
@login_required
def bt_scan_start():
    def _on_device(device):
        socketio.emit("bt_device_found", device)
    result = bt.start_scan(callback=_on_device)
    return jsonify(result)


@app.route("/api/bluetooth/scan/stop", methods=["POST"])
@login_required
def bt_scan_stop():
    return jsonify(bt.stop_scan())


@app.route("/api/bluetooth/pair/<path:address>", methods=["POST"])
@login_required
def bt_pair(address):
    return jsonify(bt.pair(address))


@app.route("/api/bluetooth/connect/<path:address>", methods=["POST"])
@login_required
def bt_connect(address):
    result = bt.connect(address)
    socketio.emit("bt_connection_change", {"address": address, "connected": result.get("ok")})
    return jsonify(result)


@app.route("/api/bluetooth/disconnect/<path:address>", methods=["POST"])
@login_required
def bt_disconnect(address):
    result = bt.disconnect(address)
    socketio.emit("bt_connection_change", {"address": address, "connected": False})
    return jsonify(result)


@app.route("/api/bluetooth/remove/<path:address>", methods=["POST"])
@login_required
def bt_remove(address):
    return jsonify(bt.remove(address))


@app.route("/api/bluetooth/send", methods=["POST"])
@login_required
def bt_send():
    data    = request.get_json(force=True)
    address = data.get("address", "")
    message = data.get("message", "")
    return jsonify(bt.send_data(address, message))


@app.route("/api/bluetooth/devices", methods=["GET"])
@login_required
def bt_devices():
    return jsonify({"devices": bt.list_paired()})


# ── System control REST API ───────────────────────────────────────────────────

@app.route("/api/system/reboot", methods=["POST"])
@login_required
def sys_reboot():
    log.warning("Reboot requested by %s", current_user.id)
    threading.Timer(1.0, lambda: os.system("sudo reboot")).start()
    return jsonify({"ok": True, "message": "Rebooting…"})


@app.route("/api/system/shutdown", methods=["POST"])
@login_required
def sys_shutdown():
    log.warning("Shutdown requested by %s", current_user.id)
    threading.Timer(1.0, lambda: os.system("sudo shutdown -h now")).start()
    return jsonify({"ok": True, "message": "Shutting down…"})


@app.route("/api/system/info", methods=["GET"])
@login_required
def sys_info():
    return jsonify(system.full_info())


# ── WebSocket events ──────────────────────────────────────────────────────────

@socketio.on("connect")
def ws_connect():
    log.info("Client connected: %s", request.sid)
    # Send initial snapshot
    emit("system_snapshot", {
        "gpio":    gpio.snapshot(),
        "system":  system.snapshot(),
        "network": network.snapshot(),
        "storage": storage.snapshot(),
        "bt":      bt.snapshot(),
    })


@socketio.on("disconnect")
def ws_disconnect():
    log.info("Client disconnected: %s", request.sid)


@socketio.on("gpio_toggle")
def ws_gpio_toggle(data):
    """Client can also toggle GPIO directly via WS (faster than REST)."""
    pin   = int(data.get("pin", 0))
    state = bool(data.get("state", False))
    result = gpio.set_pin(pin, state)
    emit("gpio_state", {"pin": pin, "state": state}, broadcast=True)
    return result


# ── Background push loop ──────────────────────────────────────────────────────

def _push_loop():
    """Push system metrics to all connected clients every 2 seconds."""
    while True:
        time.sleep(2)
        try:
            socketio.emit("metrics", {
                "system":  system.snapshot(),
                "network": network.snapshot(),
                "storage": storage.snapshot(),
            })
        except Exception as exc:
            log.error("Push loop error: %s", exc)


push_thread = threading.Thread(target=_push_loop, daemon=True)
push_thread.start()


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    log.info("Starting NeoBerry v2")
    socketio.run(app, host="0.0.0.0", port=5000, debug=False)
