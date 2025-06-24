from flask import Blueprint, jsonify
from datetime import datetime, timedelta
import os

graph_bp = Blueprint('graph', __name__)

# Dossiers où stocker tes logs horaires
SPEED_LOG_DIR = '/var/log/neoberry/speed'
VOLTAGE_LOG_DIR = '/var/log/neoberry/voltage'


def generate_hourly_data(get_value_func, source_dir):
    now = datetime.now()
    data = []

    for h in range(24):
        dt = (now - timedelta(hours=23 - h)).replace(minute=0, second=0, microsecond=0)
        label = dt.strftime('%Hh')
        value = get_value_func(source_dir, dt)
        data.append({ "hour": label, "value": value })

    return data


def get_speed_for_hour(log_dir, dt):
    """
    Lit le débit (Mb/s) moyen mesuré sur 1h à partir d’un fichier log :
    chaque ligne = valeur numérique en Mb/s
    Ex : 92.6
    """
    filename = dt.strftime('%Y-%m-%d_%H') + '.log'
    path = os.path.join(log_dir, filename)

    if not os.path.isfile(path):
        return 0

    with open(path) as f:
        values = [
            float(line.strip())
            for line in f
            if line.strip().replace('.', '', 1).isdigit()
        ]

    if not values:
        return 0

    avg = sum(values) / len(values)
    return round(avg, 2)


def get_voltage_for_hour(log_dir, dt):
    """
    Lit la tension (V) moyenne sur 1h depuis le fichier log :
    chaque ligne = mesure en volts, ex : 4.91
    """
    filename = dt.strftime('%Y-%m-%d_%H') + '.log'
    path = os.path.join(log_dir, filename)

    if not os.path.isfile(path):
        return 0

    with open(path) as f:
        values = [
            float(line.strip())
            for line in f
            if line.strip().replace('.', '', 1).isdigit()
        ]

    if not values:
        return 0

    avg = sum(values) / len(values)
    return round(avg, 3)


@graph_bp.route('/api/graph/connexion')
def graph_connexion():
    """
    Retourne un tableau {hour, value} en Mb/s sur 24h.
    """
    return jsonify(generate_hourly_data(get_speed_for_hour, SPEED_LOG_DIR))


@graph_bp.route('/api/graph/electric')
def graph_electric():
    """
    Retourne un tableau {hour, value} en volts sur 24h.
    """
    return jsonify(generate_hourly_data(get_voltage_for_hour, VOLTAGE_LOG_DIR))

