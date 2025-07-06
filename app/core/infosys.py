import os
import re
import platform
import socket
import subprocess
from datetime import datetime
from flask import Blueprint, jsonify, current_app

infosys_bp = Blueprint("infosys", __name__)

def _get_last_update():
    """
    Lit la dernière ligne de logs/update.log et renvoie
    la date et l’heure au format DD/MM/YYYY HH:MM.
    """
    log_path = os.path.normpath(
        os.path.join(current_app.root_path, os.pardir, "logs", "update.log")
    )
    if not os.path.exists(log_path):
        current_app.logger.error(f"[infosys] update.log introuvable : {log_path}")
        return None

    try:
        with open(log_path, "r", encoding="utf-8") as f:
            lines = [l.strip() for l in f if l.strip()]
        last = lines[-1]
        m = re.search(r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})", last)
        if not m:
            return None
        dt = datetime.strptime(m.group(1), "%Y-%m-%d %H:%M:%S")
        return dt.strftime("%d/%m/%Y %H:%M")
    except Exception as e:
        current_app.logger.error(f"[infosys] Erreur lecture update.log : {e}")
        return None

@infosys_bp.route("/api/infosys")
def get_sysinfo():
    try:
        os_name     = platform.system()
        os_version  = platform.release()
        hostname    = socket.gethostname()
        uptime      = subprocess.check_output(["uptime", "-p"], text=True).strip()
        last_update = _get_last_update()

        return jsonify({
            "os":           f"{os_name} {os_version}",
            "hostname":     hostname,
            "uptime":       uptime,
            "last_update":  last_update
        })
    except Exception as e:
        current_app.logger.error(f"[infosys] get_sysinfo error : {e}")
        return jsonify(error="Impossible de récupérer les infos système."), 500

