from flask import Flask, render_template, request, jsonify
import gpio_interface
import psutil
import platform
import os
import time

app = Flask(__name__)

# Initialisation des GPIO
gpio = gpio_interface.GPIOInterface()

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

@app.route('/set-fan-speed', methods=['POST'])
def set_fan_speed():
    speed = int(request.form.get('speed', 0))
    gpio.set_fan_speed(speed)
    return '', 204

def get_system_metrics():
    metrics = {
        'cpu_usage': psutil.cpu_percent(interval=1),
        'ram_usage': psutil.virtual_memory().percent,
        'board_temp': get_rpi_temperature() if platform.machine().startswith('arm') else 0,
        'cpu_temp': get_rpi_temperature() if platform.machine().startswith('arm') else 0,
        'fan_speed': 3000  # Simulé, à remplacer par une lecture réelle si disponible
    }
    return metrics

def get_rpi_temperature():
    try:
        with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
            temp = int(f.read()) / 1000  # Convertir de m°C à °C
            return min(temp, 85)  # Limiter à 85°C
    except:
        return 0

if __name__ == '__main__':
    try:
        app.run(host='0.0.0.0', port=5000, debug=True)
    finally:
        gpio.cleanup()
