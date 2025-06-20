from flask import Blueprint, jsonify, session
from functools import wraps
import psutil
import subprocess
import logging

battery_bp = Blueprint("battery", __name__)

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("logged_in"):
            return jsonify({"error": "Authentification requise"}), 401
        return f(*args, **kwargs)
    return decorated

@battery_bp.route("/api/battery")
@login_required
def battery_status():
    try:
        battery = psutil.sensors_battery()
        percent, power_plugged, secsleft = None, None, None

        if battery is not None:
            percent = battery.percent
            power_plugged = battery.power_plugged
            secsleft = (
                battery.secsleft
                if battery.secsleft != psutil.POWER_TIME_UNKNOWN
                else None
            )
        else:
            try:
                device_list = subprocess.check_output(["upower", "-e"]).decode().strip().splitlines()
                device = next((dev for dev in device_list if "battery" in dev), None)

                if device:
                    percent_raw = subprocess.check_output(["upower", "-i", device]).decode()
                    percent_line = next((line for line in percent_raw.splitlines() if "percentage" in line), "")
                    state_line = next((line for line in percent_raw.splitlines() if "state" in line), "")

                    percent = float(percent_line.strip().split()[-1].replace('%', ''))
                    state = state_line.strip().split()[-1]
                    power_plugged = state in ["charging", "fully-charged"]
                    secsleft = None
                else:
                    percent = 100
                    power_plugged = True
                    secsleft = None
                    
            except Exception as e:
                logging.error(f"Erreur fallback batterie via upower: {e}")
                percent = 100
                power_plugged = True
                secsleft = None

        return jsonify({
            "percent": percent,
            "power_plugged": power_plugged,
            "secsleft": secsleft,
            "no_battery_detected": percent == 100 and battery is None
        })

    except Exception as e:
        logging.error(f"Erreur batterie: {e}")
        return jsonify({
            "error": str(e),
            "percent": 100,
            "power_plugged": True,
            "secsleft": None,
            "no_battery_detected": True
        })

