"""
NeoBerry v2 — core/gpio.py
GPIO control with automatic simulation fallback.
On a real Raspberry Pi, uses RPi.GPIO.
Otherwise, simulates pin states in memory.

GPIO pins exposed: BCM numbering, pins 2–27.
"""

import logging
from typing import Literal

log = logging.getLogger("neoberry.gpio")

# ── Import RPi.GPIO (optional) ────────────────────────────────────────────────

try:
    import RPi.GPIO as _GPIO
    _GPIO.setmode(_GPIO.BCM)
    _GPIO.setwarnings(False)
    _HAS_GPIO = True
    log.info("RPi.GPIO loaded — real GPIO mode")
except Exception:
    _HAS_GPIO = False
    log.warning("RPi.GPIO not available — GPIO simulation mode")

# BCM pins available on the 40-pin header
AVAILABLE_PINS = [
    2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, 26, 27,
]

PinMode  = Literal["input", "output"]
PinState = bool   # True = HIGH, False = LOW


class GPIOManager:

    def __init__(self):
        # pin_state[pin] = True/False (HIGH/LOW)
        self._state: dict[int, PinState] = {p: False for p in AVAILABLE_PINS}
        # pin_mode[pin] = "input" | "output"
        self._mode:  dict[int, PinMode]  = {p: "output" for p in AVAILABLE_PINS}

        if _HAS_GPIO:
            for pin in AVAILABLE_PINS:
                try:
                    _GPIO.setup(pin, _GPIO.OUT, initial=_GPIO.LOW)
                except Exception as exc:
                    log.debug("GPIO setup error pin %d: %s", pin, exc)

    # ── Mode ──────────────────────────────────────────────────────────────────

    def set_mode(self, pin: int, mode: PinMode) -> dict:
        if pin not in AVAILABLE_PINS:
            return {"ok": False, "error": f"Invalid pin {pin}"}

        self._mode[pin] = mode

        if _HAS_GPIO:
            try:
                hw_mode = _GPIO.IN if mode == "input" else _GPIO.OUT
                _GPIO.setup(pin, hw_mode)
            except Exception as e:
                return {"ok": False, "error": str(e)}

        log.debug("Pin %d mode → %s", pin, mode)
        return {"ok": True, "pin": pin, "mode": mode}

    def get_mode(self, pin: int) -> PinMode:
        return self._mode.get(pin, "output")

    # ── State ─────────────────────────────────────────────────────────────────

    def set_pin(self, pin: int, state: PinState) -> dict:
        if pin not in AVAILABLE_PINS:
            return {"ok": False, "error": f"Invalid pin {pin}"}
        if self._mode.get(pin) == "input":
            return {"ok": False, "error": f"Pin {pin} is set to input mode"}

        self._state[pin] = state

        if _HAS_GPIO:
            try:
                _GPIO.output(pin, _GPIO.HIGH if state else _GPIO.LOW)
            except Exception as e:
                return {"ok": False, "error": str(e)}

        log.debug("Pin %d → %s", pin, "HIGH" if state else "LOW")
        return {"ok": True, "pin": pin, "state": state}

    def get_pin(self, pin: int) -> PinState:
        if not _HAS_GPIO:
            return self._state.get(pin, False)
        try:
            return bool(_GPIO.input(pin))
        except Exception:
            return self._state.get(pin, False)

    def toggle_pin(self, pin: int) -> dict:
        current = self.get_pin(pin)
        return self.set_pin(pin, not current)

    # ── Bulk read ─────────────────────────────────────────────────────────────

    def read_all(self) -> dict[int, dict]:
        result = {}
        for pin in AVAILABLE_PINS:
            result[pin] = {
                "state": self.get_pin(pin),
                "mode":  self._mode[pin],
            }
        return result

    # ── Cleanup ───────────────────────────────────────────────────────────────

    def cleanup(self):
        if _HAS_GPIO:
            try:
                _GPIO.cleanup()
            except Exception:
                pass

    # ── Snapshot ──────────────────────────────────────────────────────────────

    def snapshot(self) -> dict:
        return {
            "simulation": not _HAS_GPIO,
            "pins":       self.read_all(),
        }
