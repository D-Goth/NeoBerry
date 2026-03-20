"""
NeoBerry v2 — app.py
Flask + Flask-SocketIO  |  async_mode=threading (pas besoin d'eventlet)
"""

import os, threading, time, logging
from flask import Flask, render_template, redirect, url_for, request, jsonify
from flask_login import LoginManager, login_required, current_user
from flask_socketio import SocketIO, emit

from core.auth    import User, pam_authenticate
from core.gpio    import GPIOManager
from core.system  import SystemMonitor
from core.network import NetworkMonitor
from core.storage import StorageMonitor
from core.battery import BatteryMonitor
from core.bluetooth import BluetoothManager

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")
log = logging.getLogger("neoberry")

app = Flask(__name__)
app.secret_key = os.environ.get("NEOBERRY_SECRET", os.urandom(32))

# ── IMPORTANT: threading, pas eventlet ──────────────────────────────────────
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading",
                    logger=False, engineio_logger=False)

login_manager = LoginManager(app)
login_manager.login_view = "login"

gpio    = GPIOManager()
system  = SystemMonitor()
network = NetworkMonitor()
storage = StorageMonitor()
battery = BatteryMonitor()
bt      = BluetoothManager()

# ── Auth ─────────────────────────────────────────────────────────────────────

@login_manager.user_loader
def load_user(uid): return User(uid)

@app.route("/login", methods=["GET","POST"])
def login():
    if request.method == "POST":
        user, err = pam_authenticate(request.form.get("username","").strip(),
                                     request.form.get("password",""))
        if user:
            from flask_login import login_user
            login_user(user)
            return redirect(url_for("dashboard"))
        return render_template("login.html", error=err)
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

# ── GPIO ─────────────────────────────────────────────────────────────────────

@app.route("/api/gpio/<int:pin>", methods=["POST"])
@login_required
def gpio_toggle(pin):
    state  = bool(request.get_json(force=True).get("state", False))
    result = gpio.set_pin(pin, state)
    socketio.emit("gpio_state", {"pin": pin, "state": state})
    return jsonify(result)

@app.route("/api/gpio/<int:pin>/mode", methods=["POST"])
@login_required
def gpio_mode(pin):
    mode   = request.get_json(force=True).get("mode","output")
    return jsonify(gpio.set_mode(pin, mode))

# ── Bluetooth ────────────────────────────────────────────────────────────────

@app.route("/api/bluetooth/power", methods=["POST"])
@login_required
def bt_power():
    return jsonify(bt.set_power(bool(request.get_json(force=True).get("on",True))))

@app.route("/api/bluetooth/scan/start", methods=["POST"])
@login_required
def bt_scan_start():
    return jsonify(bt.start_scan(callback=lambda d: socketio.emit("bt_device_found", d)))

@app.route("/api/bluetooth/scan/stop", methods=["POST"])
@login_required
def bt_scan_stop():
    return jsonify(bt.stop_scan())

@app.route("/api/bluetooth/pair/<path:address>",       methods=["POST"])
@login_required
def bt_pair(address):       return jsonify(bt.pair(address))

@app.route("/api/bluetooth/connect/<path:address>",    methods=["POST"])
@login_required
def bt_connect(address):
    r = bt.connect(address)
    socketio.emit("bt_connection_change", {"address": address, "connected": r.get("ok")})
    return jsonify(r)

@app.route("/api/bluetooth/disconnect/<path:address>", methods=["POST"])
@login_required
def bt_disconnect(address):
    r = bt.disconnect(address)
    socketio.emit("bt_connection_change", {"address": address, "connected": False})
    return jsonify(r)

@app.route("/api/bluetooth/remove/<path:address>",     methods=["POST"])
@login_required
def bt_remove(address):     return jsonify(bt.remove(address))

@app.route("/api/bluetooth/send",    methods=["POST"])
@login_required
def bt_send():
    d = request.get_json(force=True)
    return jsonify(bt.send_data(d.get("address",""), d.get("message","")))

@app.route("/api/bluetooth/devices", methods=["GET"])
@login_required
def bt_devices():           return jsonify({"devices": bt.list_paired()})

# ── Système ──────────────────────────────────────────────────────────────────

@app.route("/api/system/reboot",   methods=["POST"])
@login_required
def sys_reboot():
    log.warning("Reboot par %s", current_user.id)
    threading.Timer(1.0, lambda: os.system("sudo reboot")).start()
    return jsonify({"ok": True, "message": "Redémarrage…"})

@app.route("/api/system/shutdown", methods=["POST"])
@login_required
def sys_shutdown():
    log.warning("Shutdown par %s", current_user.id)
    threading.Timer(1.0, lambda: os.system("sudo shutdown -h now")).start()
    return jsonify({"ok": True, "message": "Extinction…"})

@app.route("/api/system/update", methods=["POST"])
@login_required
def sys_update():
    log.info("Update demandé par %s", current_user.id)
    def _run():
        os.system("sudo apt-get update -qq && sudo apt-get upgrade -y -qq")
    threading.Thread(target=_run, daemon=True).start()
    return jsonify({"ok": True, "message": "Mise à jour lancée en arrière-plan…"})

@app.route("/api/system/restart", methods=["POST"])
@login_required
def sys_restart():
    log.info("Restart NeoBerry par %s", current_user.id)
    threading.Timer(1.0, lambda: os.execv(__file__, ['python'] + [__file__])).start()
    return jsonify({"ok": True, "message": "NeoBerry redémarre…"})

@app.route("/api/system/info", methods=["GET"])
@login_required
def sys_info():             return jsonify(system.full_info())

@app.route("/api/battery",   methods=["GET"])
@login_required
def api_battery():          return jsonify(battery.snapshot())

# ── WebSocket ────────────────────────────────────────────────────────────────

@socketio.on("connect")
def ws_connect():
    log.info("WS connect: %s", request.sid)
    emit("system_snapshot", {
        "gpio":    gpio.snapshot(),
        "system":  system.snapshot(),
        "network": network.snapshot(),
        "storage": storage.snapshot(),
        "battery": battery.snapshot(),
        "bt":      bt.snapshot(),
    })

@socketio.on("disconnect")
def ws_disconnect():
    log.info("WS disconnect: %s", request.sid)

@socketio.on("gpio_toggle")
def ws_gpio_toggle(data):
    pin, state = int(data.get("pin",0)), bool(data.get("state",False))
    result = gpio.set_pin(pin, state)
    emit("gpio_state", {"pin": pin, "state": state}, broadcast=True)
    return result

# ── Push loop ────────────────────────────────────────────────────────────────

def _push_loop():
    while True:
        time.sleep(2)
        try:
            socketio.emit("metrics", {
                "system":  system.snapshot(),
                "network": network.snapshot(),
                "storage": storage.snapshot(),
                "battery": battery.snapshot(),
            })
        except Exception as e:
            log.error("Push loop: %s", e)

threading.Thread(target=_push_loop, daemon=True).start()

if __name__ == "__main__":
    log.info("NeoBerry v2 — démarrage")
    socketio.run(app, host="0.0.0.0", port=5000, debug=False, use_reloader=False)
