# gpio_pins.py - Liste des GPIO utilisés sur Raspberry Pi

# Définition des pins GPIO en mode BCM
gpio_pins = [2, 3, 4, 17, 27, 22, 10, 9, 11, 5]

# États simulés pour mode Démonstration
gpio_states = {pin: False for pin in gpio_pins}

# Fonction d'affichage des pins actifs
def print_gpio_status():
    for pin in gpio_pins:
        state = "ON" if gpio_states[pin] else "OFF"
        print(f"GPIO {pin}: {state}")

# Mode Démo : Test des états GPIO
if __name__ == "__main__":
    print("Mode Démonstration - États des GPIO simulés")
    print_gpio_status()

