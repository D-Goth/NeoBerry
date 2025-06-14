import time
import platform

if platform.machine().startswith('arm'):
    import RPi.GPIO as GPIO

class GPIOInterface:
    def __init__(self):
        self.FAN_PIN = 18
        self.PINS = list(range(2, 28))
        self._setup()

    def _setup(self):
        if platform.machine().startswith('arm'):
            GPIO.setmode(GPIO.BCM)
            for pin in self.PINS:
                GPIO.setup(pin, GPIO.OUT)
                GPIO.output(pin, GPIO.LOW)
            GPIO.setup(self.FAN_PIN, GPIO.OUT)
            self.fan_pwm = GPIO.PWM(self.FAN_PIN, 100)
            self.fan_pwm.start(0)
            self._simulate = False
        else:
            print("Mode simulation activé (pas sur un Raspberry Pi)")
            self._simulate = True

    def get_pin_states(self):
        if hasattr(self, '_simulate') and self._simulate:
            return {pin: False for pin in self.PINS}
        else:
            return {pin: GPIO.input(pin) == GPIO.HIGH for pin in self.PINS}

    def set_pin_state(self, pin, state):
        if pin not in self.PINS:
            return
        if not (hasattr(self, '_simulate') and self._simulate):
            GPIO.output(pin, GPIO.HIGH if state else GPIO.LOW)

    def set_fan_speed(self, speed):
        if not (hasattr(self, '_simulate') and self._simulate):
            duty_cycle = min(100, max(0, speed))
            self.fan_pwm.ChangeDutyCycle(duty_cycle)

    def cleanup(self):
        if not (hasattr(self, '_simulate') and self._simulate):
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

