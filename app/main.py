from flask import Flask, render_template, request, jsonify
import gpio_interface
import psutil
import platform
import os
import time

app = Flask(__name__)

# Initialisation des GPIO avec détection de simulation
try:
    gpio = gpio_interface.GPIOInterface()
    is_simulated = False
except Exception as e:
    print(f"Mode simulation activé : {e}")
    gpio = gpio_interface.GPIOInterface()  # Forcer la simulation
    is_simulated = True

@app.route('/')
def index():
    pins = gpio.get_pin_states()
    activity = {pin: False for pin in range(2, 28)}  # Simulé pour l'exemple
    metrics = get_system_metrics()
    return render_template('index.html', pins=pins, activity=activity, metrics=metrics)

@app.route('/toggle/<int:pin>', methods=['POST'])
def toggle_pin(pin):
    state = request.form.get('state') == 'true'
    gpio.set_pin_state(pin, state)
    return '', 204

@app.route('/status')
def status():
    pins = gpio.get_pin_states()
    activity = {pin: False for pin in range(2, 28)}  # Simulé pour l'exemple
    metrics = get_system_metrics()
    return jsonify({'pins': pins, 'activity': activity, 'metrics': metrics})

@app.route('/reboot')
def reboot():
    os.system('sudo reboot')
    return '', 204

@app.route('/shutdown')
def shutdown():
    os.system('sudo shutdown -h now')
    return '', 204

def get_system_metrics():
    metrics = {
        'cpu_usage': psutil.cpu_percent(interval=1),
        'ram_usage': psutil.virtual_memory().percent,
        'board_temp': get_rpi_temperature() if platform.machine().startswith('arm') else 0,
        'cpu_temp': get_rpi_temperature() if platform.machine().startswith('arm') else 0,
        'fan_speed': 3000 if not is_simulated else 0
    }
    # Ajouter les disques
    disks = {}
    for part in psutil.disk_partitions():
        if 'loop' not in part.device and 'squashfs' not in part.device:
            usage = psutil.disk_usage(part.mountpoint)
            disk_name = part.device.replace('/dev/', '').replace('sd', 'Disk').replace('mmcblk', 'HAT')
            disk_temp = get_disk_temperature(part.device) or 0
            disks[disk_name] = {
                'usage': usage.percent,
                'mountpoint': part.mountpoint,
                'temp': disk_temp
            }
    if disks:
        metrics['disks'] = disks
    # Ajouter les stats réseau
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
        # Initialisation des données précédentes si elles n'existent pas
        if not hasattr(get_network_usage, 'prev_net'):
            get_network_usage.prev_net = net
            get_network_usage.up_history = []
            get_network_usage.down_history = []
            return {'up': 0, 'down': 0}

        # Calcul de la différence sur un intervalle
        interval = 2  # Intervalle en secondes
        time.sleep(interval)  # Attendre pour une mesure stable
        net = psutil.net_io_counters()
        bytes_sent_diff = (net.bytes_sent - get_network_usage.prev_net.bytes_sent) / interval
        bytes_recv_diff = (net.bytes_recv - get_network_usage.prev_net.bytes_recv) / interval

        # Conversion en unités adaptatives
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
        return {'up': up_speed, 'down': down_speed}
    except Exception as e:
        print(f"Erreur réseau : {e}")
        return {'up': 'N/A', 'down': 'N/A'}

if __name__ == '__main__':
    try:
        app.run(host='0.0.0.0', port=5000, debug=True)
    finally:
        gpio.cleanup()
