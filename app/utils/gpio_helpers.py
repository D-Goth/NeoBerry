import platform
import logging

try:
    import RPi.GPIO as GPIO
    IS_RPI = True
except (ImportError, RuntimeError):
    IS_RPI = False

# Broches BCM réellement utilisables (hors alim/GND/EEPROM)
GPIO_PINS = [
    2, 3, 4,
    5, 6, 7, 8, 9, 10, 11, 12, 13,
    14, 15, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, 26, 27
]

gpio_states = {pin: False for pin in GPIO_PINS}

if IS_RPI:
    GPIO.setmode(GPIO.BCM)
    for pin in GPIO_PINS:
        try:
            GPIO.setup(pin, GPIO.OUT)
            GPIO.output(pin, GPIO.LOW)
        except Exception as e:
            logging.warning(f"GPIO setup failed for pin {pin}: {e}")
else:
    logging.info("GPIO simulation active (non-Raspberry Pi platform)")

def is_raspberry_pi():
    uname = platform.uname()
    return IS_RPI or "raspberrypi" in uname.system.lower()

def write_gpio(pin, state):
    if pin not in GPIO_PINS:
        raise ValueError(f"Pin {pin} non autorisé")
    if IS_RPI:
        try:
            GPIO.output(pin, GPIO.HIGH if state else GPIO.LOW)
        except Exception as e:
            logging.error(f"Erreur écriture GPIO {pin}: {e}")
            raise
    gpio_states[pin] = state

def read_gpio(pin):
    if pin not in GPIO_PINS:
        raise ValueError(f"Pin {pin} non autorisé")
    if IS_RPI:
        try:
            val = GPIO.input(pin)
            gpio_states[pin] = bool(val)
            return gpio_states[pin]
        except Exception as e:
            logging.error(f"Erreur lecture GPIO {pin}: {e}")
            return False
    return gpio_states.get(pin, False)

