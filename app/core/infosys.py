from flask import Blueprint, jsonify, request, session
import platform
import socket
import subprocess
import logging

infosys_bp = Blueprint("infosys", __name__)


@infosys_bp.route("/api/infosys")
def get_sysinfo():
    try:
        os_name = platform.system()
        os_version = platform.release()
        hostname = socket.gethostname()
        uptime = subprocess.check_output(["uptime", "-p"], text=True).strip()

        return jsonify({
            "os": f"{os_name} {os_version}",
            "hostname": hostname,
            "uptime": uptime
        })
    except Exception:
        return jsonify(error="Impossible de récupérer les infos système."), 500


