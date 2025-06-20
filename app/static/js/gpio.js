const gpioContainer = document.getElementById('gpio-controls');
let gpioPins = [];

/**
 * Met à jour dynamiquement les interrupteurs GPIO visibles.
 * Ne crée que ceux correspondant aux pins disponibles du backend.
 */
export function updateGPIOControl(gpioData) {
   const gpioStates = gpioData.states || {};
   const validPins = gpioData.available_pins || [];

   // Ne créer qu’une fois les éléments
   if (gpioPins.length === 0) {
      validPins.forEach((pinNumber) => {
         const pin = document.createElement('div');
         pin.className = 'gpio-pin';
         pin.setAttribute('role', 'gridcell');
         pin.setAttribute('tabindex', '0');

         const led = document.createElement('div');
         led.className = 'led-indicator';
         pin.appendChild(led);

         const labelSwitch = document.createElement('label');
         labelSwitch.className = 'switch';

         const checkbox = document.createElement('input');
         checkbox.type = 'checkbox';
         checkbox.setAttribute('aria-checked', 'false');
         checkbox.setAttribute('aria-label', `Interrupteur GPIO ${pinNumber}`);
         labelSwitch.appendChild(checkbox);

         const sliderSpan = document.createElement('span');
         sliderSpan.className = 'slider';
         labelSwitch.appendChild(sliderSpan);

         pin.appendChild(labelSwitch);

         const pinLabel = document.createElement('div');
         pinLabel.className = 'gpio-number';
         pinLabel.textContent = `GPIO ${pinNumber}`;
         pin.appendChild(pinLabel);

         // Gestion du clic
         checkbox.addEventListener('change', (e) => {
            const checked = e.target.checked;
            pin.classList.toggle('active', checked);
            led.classList.toggle('on', checked);
            checkbox.setAttribute('aria-checked', checked.toString());

            fetch('/api/gpio', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ pin: pinNumber, state: checked }),
            }).catch(() => {});
         });

         gpioContainer.appendChild(pin);
         gpioPins.push({ pinNumber, element: pin, led, checkbox });
      });
   }

   // Met à jour l'état des LED/boutons
   gpioPins.forEach(({ pinNumber, checkbox, element, led }) => {
      const state = gpioStates[pinNumber];
      if (typeof state === 'boolean') {
         checkbox.checked = state;
         checkbox.setAttribute('aria-checked', state.toString());
         element.classList.toggle('active', state);
         led.classList.toggle('on', state);
      }
   });
}

