import os
import shutil
import subprocess
import logging
import threading
import time
from flask import Blueprint, jsonify
from datetime import datetime

voltage_bp = Blueprint("voltage", __name__)

# 📁 Chemin vers logs/neoberry.log
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(BASE_DIR, '..', '..', 'logs', 'neoberry.log')

def measure_voltage_status():
    if shutil.which("vcgencmd") is None:
        return 'neutral'
    try:
        output = subprocess.check_output(["vcgencmd", "get_throttled"]).decode().strip()
        code = int(output.split('=')[1], 16)
        if code == 0x0:
            return 'ok'
        elif code & 0x20000:
            return 'bad'
        elif code & 0x50000:
            return 'warn'
        else:
            return 'warn'
    except:
        return 'neutral'

@voltage_bp.route("/api/voltage")
def get_voltage():
    status = measure_voltage_status()
    labels = {
        'ok': "🟢 Tension OK",
        'bad': "🔴 Tension Faible",
        'warn': "🟡 Tension Instable",
        'neutral': "🔌 En service — sans relevé actif"
    }
    return jsonify({
        "status": status,
        "label": labels.get(status, "🔌 État inconnu")
    })

def log_voltage_status():
    status = measure_voltage_status()
    now = datetime.now().strftime('%Y-%m-%d %H:%M')
    try:
        with open(LOG_PATH, 'a') as f:
            f.write(f"[{now}] voltage_status: {status}\n")
    except Exception as e:
        logging.warning(f"Erreur écriture voltage log : {e}")

def voltage_auto_logger():
    while True:
        log_voltage_status()
        time.sleep(60)

def start_voltage_logger():
    thread = threading.Thread(target=voltage_auto_logger, daemon=True)
    thread.start()

