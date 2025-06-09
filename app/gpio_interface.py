class GPIOInterface:
    def __init__(self):
        self.pins = {pin: False for pin in range(2, 28)}

    def toggle_pin(self, pin):
        if pin in self.pins:
            self.pins[pin] = not self.pins[pin]

    def get_all_pins(self):
        return self.pins
