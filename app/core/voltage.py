import shutil
import subprocess
from flask import Blueprint, jsonify

voltage_bp = Blueprint("voltage", __name__)

@voltage_bp.route("/api/voltage")
def get_voltage():
    if shutil.which("vcgencmd") is None:
        return jsonify({"status": "neutral", "label": "🔌 En service — sans relevé actif"})

    try:
        output = subprocess.check_output(["vcgencmd", "get_throttled"]).decode().strip()
        code = int(output.split('=')[1], 16)

        if code == 0x0:
            return jsonify({"status": "ok", "label": "🟢 Tension OK"})
        elif code & 0x20000:
            return jsonify({"status": "bad", "label": "🔴 Tension Faible"})
        elif code & 0x50000:
            return jsonify({"status": "warn", "label": "🟡 Tension Instable"})
        else:
            return jsonify({"status": "warn", "label": f"🟡 Code : {output}"})
    except Exception as e:
        return jsonify({"status": "neutral", "label": f"🔌 Erreur : {str(e)}"})

