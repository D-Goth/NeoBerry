import os
import re
from datetime import datetime, timedelta
from flask import Blueprint, jsonify

graph_bp = Blueprint('graph', __name__)

# 📁 Chemin vers le fichier de log unique
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(BASE_DIR, '..', '..', 'logs', 'neoberry.log')

def generate_hourly_voltage_data(log_path):
    now = datetime.now()
    data = []

    for h in range(24):
        dt = (now - timedelta(hours=23 - h)).replace(minute=0, second=0, microsecond=0)
        label = dt.strftime('%Hh')
        value = get_voltage_status_for_hour(log_path, dt)
        data.append({ "hour": label, "value": value })

    return data

def generate_hourly_network_data(log_path):
    now = datetime.now()
    data = []

    for h in range(24):
        dt = (now - timedelta(hours=23 - h)).replace(minute=0, second=0, microsecond=0)
        label = dt.strftime('%Hh')
        down = get_net_value_for_hour(log_path, dt, 'net_down')
        up = get_net_value_for_hour(log_path, dt, 'net_up')
        data.append({ "hour": label, "down": down, "up": up })

    return data

def get_voltage_status_for_hour(log_path, dt):
    pattern = dt.strftime('[%Y-%m-%d %H:')
    stat_to_value = {'neutral': 0, 'bad': 1, 'warn': 2, 'ok': 3}
    values = []

    if not os.path.isfile(log_path):
        return 0

    with open(log_path) as f:
        for line in f:
            if not line.startswith(pattern):
                continue
            match = re.search(r'voltage_status:\s*(\w+)', line)
            if match:
                code = match.group(1).lower()
                if code in stat_to_value:
                    values.append(stat_to_value[code])

    return round(sum(values) / len(values), 2) if values else 0

def get_net_value_for_hour(log_path, dt, key):
    pattern = dt.strftime('[%Y-%m-%d %H:')
    values = []

    if not os.path.isfile(log_path):
        return 0

    with open(log_path) as f:
        for line in f:
            if not line.startswith(pattern):
                continue
            match = re.search(fr'{key}:\s*([\d.]+)', line)
            if match:
                try:
                    val = float(match.group(1))
                    values.append(val)
                except:
                    pass

    return round(sum(values) / len(values), 2) if values else 0

@graph_bp.route('/api/graph/electric')
def graph_electric():
    return jsonify(generate_hourly_voltage_data(LOG_PATH))

@graph_bp.route('/api/graph/connexion')
def graph_connexion():
    return jsonify(generate_hourly_network_data(LOG_PATH))

