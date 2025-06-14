import os

def is_raspberry_pi():
    try:
        with open("/proc/device-tree/model", "r") as f:
            return "Raspberry Pi" in f.read()
    except:
        return False

IS_RPI = is_raspberry_pi()
gpio_pins = [2, 3, 4, 17, 27, 22, 10, 9, 11, 5]
fan_gpio = 18  # Pin PWM pour le ventilateur

if IS_RPI:
    import RPi.GPIO as GPIO
    GPIO.setmode(GPIO.BCM)
    for pin in gpio_pins:
        GPIO.setup(pin, GPIO.OUT)
        GPIO.output(pin, GPIO.LOW)
    GPIO.setup(fan_gpio, GPIO.OUT)
    fan_pwm = GPIO.PWM(fan_gpio, 100)  # Fréquence de 100 Hz
    fan_pwm.start(50)  # Vitesse à 50% par défaut
else:
    gpio_states = {pin: False for pin in gpio_pins}
    fan_speed = 50

def toggle_gpio(pin):
    """ Active/désactive un GPIO """
    if IS_RPI:
        state = GPIO.input(pin)
        GPIO.output(pin, not state)
        return not state
    else:
        gpio_states[pin] = not gpio_states[pin]
        return gpio_states[pin]

def get_fan_speed():
    """ Récupère la vitesse du ventilateur """
    return fan_pwm if IS_RPI else fan_speed

