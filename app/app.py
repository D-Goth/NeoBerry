import time
from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    send_from_directory,
    session,
    flash,
    redirect,
    url_for
)
import gpio_interface
import psutil
import platform
import os
import logging
import pam  # Module PAM pour l'authentification Linux
from functools import wraps

# Configurer le logging
logging.basicConfig(
    filename='app.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

app = Flask(__name__)
# Configuration de la clé secrète : utilise la variable d'environnement FLASK_SECRET_KEY si définie, sinon génère une clé aléatoire
app.secret_key = os.environ.get('FLASK_SECRET_KEY', os.urandom(24))

# Décorateur pour protéger les routes sensibles
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session:
            flash("Vous devez être connecté pour accéder à cette page.", "warning")
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Configuration des GPIO avec détection de simulation
try:
    gpio = gpio_interface.GPIOInterface()
    is_simulated = False
except Exception as e:
    print(f"Mode simulation activé : {e}")
    gpio = gpio_interface.GPIOInterface()
    is_simulated = True

# Route de login
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        p = pam.pam()
        if p.authenticate(username, password):
            session['username'] = username
            flash("Connexion réussie", "success")
            return redirect(url_for('index'))
        else:
            flash("Nom d'utilisateur ou mot de passe incorrect.", "danger")
    return render_template('login.html')

# Route de logout
@app.route('/logout')
@login_required
def logout():
    session.pop('username', None)
    flash("Vous êtes déconnecté.", "info")
    return redirect(url_for('login'))

# Page principale, protégée par login_required
@app.route('/')
@login_required
def index():
    pins = gpio.get_pin_states()
    activity = {pin: False for pin in range(1, 41)}
    metrics = get_system_metrics()
    return render_template('index.html', pins=pins, activity=activity, metrics=metrics)

# Route pour basculer l'état d'un GPIO
@app.route('/toggle/<int:pin>', methods=['POST'])
@login_required
def toggle_pin(pin):
    state = request.form.get('state') == 'true'
    gpio.set_pin_state(pin, state)
    return '', 204

# Route renvoyant l'état et les métriques (pour mise à jour AJAX)
@app.route('/status')
@login_required
def status():
    pins = gpio.get_pin_states()
    activity = {pin: False for pin in range(1, 41)}
    metrics = get_system_metrics()
    logging.debug("Metrics sent: %s", metrics)
    return jsonify({'pins': pins, 'activity': activity, 'metrics': metrics})

# Route pour redémarrer la Raspberry Pi
@app.route('/reboot')
@login_required
def reboot():
    os.system('sudo reboot')
    return '', 204

# Route pour éteindre la Raspberry Pi
@app.route('/shutdown')
@login_required
def shutdown():
    os.system('sudo shutdown -h now')
    return '', 204

# Route pour servir les images
@app.route('/img/<path:filename>')
def serve_image(filename):
    return send_from_directory('/home/d-goth/NeoBerry/img', filename)

# Route pour servir le fichier models.json
@app.route('/models.json')
def serve_models():
    return send_from_directory('/home/d-goth/NeoBerry/app/static', 'models.json')

def get_system_metrics():
    metrics = {
        'cpu_usage': psutil.cpu_percent(interval=1),
        'ram_usage': psutil.virtual_memory().percent,
        'board_temp': get_rpi_temperature() if platform.machine().startswith('arm') else 0,
        'cpu_temp': get_rpi_temperature() if platform.machine().startswith('arm') else 0,
        'fan_speed': 1200 if not is_simulated else 0
    }
    disks = {}
    for part in psutil.disk_partitions():
        if 'loop' not in part.device and 'squashfs' not in part.device:
            usage = psutil.disk_usage(part.mountpoint)
            disk_name = part.device.replace('/dev/', '').replace('sd', 'Disk').replace('mmcblk', 'HAT')
            disk_temp = get_disk_temperature(part.device) or 0
            disks[disk_name] = {'usage': usage.percent, 'mountpoint': part.mountpoint, 'temp': disk_temp}
    if disks:
        metrics['disks'] = disks
    net = get_network_usage()
    metrics['network_up'] = net['up']
    metrics['network_down'] = net['down']
    return metrics

def get_rpi_temperature():
    try:
        with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
            temp = int(f.read()) / 1000
            return min(temp, 85)
    except:
        return 0

def get_disk_temperature(device):
    try:
        temps = psutil.sensors_temperatures()
        for name, entries in temps.items():
            for entry in entries:
                if device in entry.label or device.replace('/dev/', '') in entry.label:
                    return entry.current
        return None
    except:
        return None

def get_network_usage():
    try:
        net = psutil.net_io_counters()
        if not hasattr(get_network_usage, 'prev_net'):
            get_network_usage.prev_net = net
            get_network_usage.last_time = time.time()
            return {'up': 'N/A', 'down': 'N/A'}
        current_time = time.time()
        if current_time - get_network_usage.last_time < 1:
            return {'up': get_network_usage.last_up, 'down': get_network_usage.last_down}
        bytes_sent_diff = (net.bytes_sent - get_network_usage.prev_net.bytes_sent) / (current_time - get_network_usage.last_time)
        bytes_recv_diff = (net.bytes_recv - get_network_usage.prev_net.bytes_recv) / (current_time - get_network_usage.last_time)
        def format_speed(bytes_per_sec):
            if bytes_per_sec < 1024: 
                return f"{bytes_per_sec:.1f} B/s"
            elif bytes_per_sec < 1024 * 1024: 
                return f"{bytes_per_sec / 1024:.1f} KB/s"
            elif bytes_per_sec < 1024 * 1024 * 1024: 
                return f"{bytes_per_sec / (1024 * 1024):.1f} MB/s"
            else: 
                return f"{bytes_per_sec / (1024 * 1024 * 1024):.1f} GB/s"
        up_speed = format_speed(bytes_sent_diff)
        down_speed = format_speed(bytes_recv_diff)
        get_network_usage.prev_net = net
        get_network_usage.last_time = current_time
        get_network_usage.last_up = up_speed
        get_network_usage.last_down = down_speed
        return {'up': up_speed, 'down': down_speed}
    except Exception as e:
        print(f"Erreur réseau : {e}")
        return {'up': 'N/A', 'down': 'N/A'}

if __name__ == '__main__':
    try:
        app.run(host='0.0.0.0', port=5000, debug=True)
    finally:
        gpio.cleanup()

