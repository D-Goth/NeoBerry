from flask import Flask, render_template
from gpio_interface import GPIOInterface

app = Flask(__name__)
gpio = GPIOInterface()

@app.route("/")
def index():
    pins = gpio.get_all_pins()
    return render_template("index.html", pins=pins)

@app.route("/toggle/<int:pin>")
def toggle(pin):
    gpio.toggle_pin(pin)
    return "OK", 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
