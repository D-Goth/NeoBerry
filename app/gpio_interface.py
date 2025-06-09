import RPi.GPIO as GPIO
import time

class GPIOInterface:
    def __init__(self):
        self.FAN_PIN = 18
        self.PINS = list(range(2, 28))
        self._setup()

    def _setup(self):
        try:
            GPIO.setmode(GPIO.BCM)
            for pin in self.PINS:
                GPIO.setup(pin, GPIO.OUT)
                GPIO.output(pin, GPIO.LOW)
            GPIO.setup(self.FAN_PIN, GPIO.OUT)
            self.fan_pwm = GPIO.PWM(self.FAN_PIN, 100)  # 100 Hz
            self.fan_pwm.start(0)
        except:
            print("Mode simulation activé (pas de RPi.GPIO)")
            self._simulate = True

    def get_pin_states(self):
        if hasattr(self, '_simulate'):
            return {pin: False for pin in self.PINS}
        return {pin: GPIO.input(pin) == GPIO.HIGH for pin in self.PINS}

    def set_pin_state(self, pin, state):
        if pin not in self.PINS:
            return
        if not hasattr(self, '_simulate'):
            GPIO.output(pin, GPIO.HIGH if state else GPIO.LOW)

    def set_fan_speed(self, speed):
        if not hasattr(self, '_simulate'):
            duty_cycle = min(100, max(0, speed))  # Limiter entre 0 et 100
            self.fan_pwm.ChangeDutyCycle(duty_cycle)

    def cleanup(self):
        if not hasattr(self, '_simulate'):
            self.fan_pwm.stop()
            for pin in self.PINS:
                GPIO.output(pin, GPIO.LOW)
            GPIO.cleanup()

if __name__ == '__main__':
    gpio = GPIOInterface()
    try:
        while True:
            gpio.set_pin_state(2, True)
            time.sleep(1)
            gpio.set_pin_state(2, False)
            time.sleep(1)
    except KeyboardInterrupt:
        gpio.cleanup()
