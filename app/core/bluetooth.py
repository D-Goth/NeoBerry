from flask import Blueprint, jsonify, request, session
from functools import wraps
import subprocess
import re
import logging

bluetooth_bp = Blueprint("bluetooth", __name__)

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("logged_in"):
            return jsonify({"error": "Authentification requise"}), 401
        return f(*args, **kwargs)
    return decorated

def run_cmd(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True).stdout.strip()


@bluetooth_bp.route("/bluetooth/on", methods=["POST"])
@login_required
def bluetooth_on():
    run_cmd("rfkill unblock bluetooth")
    run_cmd("bluetoothctl power on")
    return jsonify({"status": "on"})

@bluetooth_bp.route("/bluetooth/off", methods=["POST"])
@login_required
def bluetooth_off():
    run_cmd("bluetoothctl power off")
    return jsonify({"status": "off"})

@bluetooth_bp.route("/bluetooth/scan", methods=["GET"])
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

@bluetooth_bp.route("/bluetooth/pair", methods=["POST"])
@login_required
def bluetooth_pair():
    data = request.get_json()
    address = data.get("address")
    output = run_cmd(f"bluetoothctl pair {address}")
    return jsonify({"result": output})

@bluetooth_bp.route("/bluetooth/connect", methods=["POST"])
@login_required
def bluetooth_connect():
    data = request.get_json()
    address = data.get("address")
    output = run_cmd(f"bluetoothctl connect {address}")
    return jsonify({"result": output})

@bluetooth_bp.route("/bluetooth/trusted", methods=["POST"])
@login_required
def bluetooth_trust():
    data = request.get_json()
    address = data.get("address")
    run_cmd(f"bluetoothctl trust {address}")
    return jsonify({"status": "trusted"})

@bluetooth_bp.route("/bluetooth/remove", methods=["POST"])
@login_required
def bluetooth_remove():
    data = request.get_json()
    address = data.get("address")
    output = run_cmd(f"bluetoothctl remove {address}")
    return jsonify({"result": output})

@bluetooth_bp.route("/bluetooth/paired", methods=["GET"])
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

@bluetooth_bp.route("/bluetooth/signal", methods=["POST"])
@login_required
def bluetooth_signal():
    address = request.get_json().get("address")
    try:
        output = run_cmd(f"hcitool rssi {address}")
        match = re.search(r"RSSI return value:\s*(-?\d+)", output)
        if match:
            rssi = int(match.group(1))
            quality = min(max(int((rssi + 100) * 1.25), 0), 100)
            return jsonify({"rssi": rssi, "quality": quality})
        else:
            return jsonify({"rssi": None, "quality": 0})
    except Exception as e:
        logging.error(f"Erreur RSSI : {e}")
        return jsonify({"rssi": None, "quality": 0})

@bluetooth_bp.route("/api/bluetooth/status", methods=["GET"])
@login_required
def get_bluetooth_status():
    try:
        paired_output = run_cmd("bluetoothctl paired-devices")
        if paired_output:
            connected_device = paired_output.splitlines()[0].split(' ', 2)[-1]
            quality = 75  # Si tu veux, on peut rendre ça dynamique avec bluetooth_signal()
            return jsonify({"device": connected_device, "quality": quality})
        else:
            return jsonify({"device": None, "quality": 0})
    except Exception as e:
        logging.error(f"Erreur statut Bluetooth : {e}")
        return jsonify({"device": None, "quality": 0})
