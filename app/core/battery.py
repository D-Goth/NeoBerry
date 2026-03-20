"""
NeoBerry v2 — core/battery.py
Détection automatique de l'alimentation du Raspberry Pi :
  1. /sys/class/power_supply  (UPS HAT génériques, PiJuice, Waveshare...)
  2. I2C INA219               (capteur courant/tension GPIO)
  3. GPIO via ADC             (lecture analogique)
  4. PoE HAT                  (détection sysfs)
  5. Simulation               (hors RPi)
"""

import os, glob, logging, time
from pathlib import Path

log = logging.getLogger("neoberry.battery")

# ── Tentative INA219 (mesure courant/tension via I2C) ────────────────────────
try:
    from ina219 import INA219 as _INA219, DeviceRangeError
    _HAS_INA = True
except ImportError:
    _HAS_INA = False

# ── Tentative smbus2 (lecture registres I2C bas niveau) ──────────────────────
try:
    import smbus2 as smbus
    _HAS_SMBUS = True
except ImportError:
    _HAS_SMBUS = False


# ── Sysfs power_supply ────────────────────────────────────────────────────────

def _sysfs_supplies() -> list[str]:
    return glob.glob("/sys/class/power_supply/*")

def _read_ps(path: str, attr: str) -> str | None:
    try:
        return Path(f"{path}/{attr}").read_text().strip()
    except Exception:
        return None

def _int(v) -> int | None:
    try: return int(v)
    except: return None

def _sysfs_snapshot() -> dict | None:
    supplies = _sysfs_supplies()
    if not supplies:
        return None

    batteries = [s for s in supplies if _read_ps(s, "type") in ("Battery", "UPS")]
    ac_sources = [s for s in supplies if _read_ps(s, "type") in ("Mains", "USB")]

    if not batteries:
        return None

    bp = batteries[0]

    # Capacité
    cap_now  = _int(_read_ps(bp, "capacity"))
    cap_full = None
    charge_now  = _int(_read_ps(bp, "charge_now"))  or _int(_read_ps(bp, "energy_now"))
    charge_full = _int(_read_ps(bp, "charge_full")) or _int(_read_ps(bp, "energy_full"))
    if cap_now is None and charge_now and charge_full and charge_full > 0:
        cap_now = int(charge_now / charge_full * 100)

    # Tension (µV → V)
    voltage_uv = _int(_read_ps(bp, "voltage_now"))
    voltage = round(voltage_uv / 1_000_000, 2) if voltage_uv else None

    # Courant (µA → mA)
    current_ua = _int(_read_ps(bp, "current_now"))
    current_ma = round(abs(current_ua) / 1000, 1) if current_ua else None

    # Puissance (µW → W)
    power_uw = _int(_read_ps(bp, "power_now"))
    power_w  = round(power_uw / 1_000_000, 2) if power_uw else None
    if power_w is None and voltage and current_ma:
        power_w = round(voltage * current_ma / 1000, 2)

    # Status
    status_raw = _read_ps(bp, "status") or "Unknown"
    status_map = {
        "Charging":    "charge",
        "Discharging": "decharge",
        "Full":        "plein",
        "Not charging":"pas_charge",
        "Unknown":     "inconnu",
    }
    status = status_map.get(status_raw, status_raw.lower())

    # Alimentation secteur connectée ?
    ac_online = any(_read_ps(s, "online") == "1" for s in ac_sources)

    # Source détectée
    name  = _read_ps(bp, "model_name") or os.path.basename(bp)
    mtype = _read_ps(bp, "type") or "Battery"

    return {
        "available":    True,
        "source":       "sysfs",
        "name":         name,
        "type":         mtype,
        "percent":      cap_now,
        "voltage":      voltage,
        "current_ma":   current_ma,
        "power_w":      power_w,
        "status":       status,
        "ac_online":    ac_online,
        "charging":     status_raw == "Charging",
        "full":         status_raw == "Full",
    }


# ── INA219 (capteur I2C courant/tension) ──────────────────────────────────────

def _ina219_snapshot() -> dict | None:
    if not _HAS_INA:
        return None
    try:
        ina = _INA219(0.1)   # shunt 0.1Ω (valeur standard des HAT)
        ina.configure()
        voltage = round(ina.voltage(), 2)
        try:
            current = round(ina.current(), 1)
            power   = round(ina.power() / 1000, 2)
        except DeviceRangeError:
            current = None
            power   = None

        # Estimation % batterie LiPo (3.0V = 0%, 4.2V = 100%)
        pct = None
        if voltage:
            pct = max(0, min(100, int((voltage - 3.0) / 1.2 * 100)))

        return {
            "available":  True,
            "source":     "ina219",
            "name":       "INA219",
            "type":       "LiPo",
            "percent":    pct,
            "voltage":    voltage,
            "current_ma": current,
            "power_w":    power,
            "status":     "mesure",
            "ac_online":  None,
            "charging":   current > 0 if current else None,
            "full":       pct == 100 if pct is not None else False,
        }
    except Exception as e:
        log.debug("INA219 non disponible: %s", e)
        return None


# ── PoE HAT (sysfs spécifique RPi PoE) ────────────────────────────────────────

def _poe_snapshot() -> dict | None:
    poe_path = "/sys/class/hwmon"
    try:
        for hwmon in glob.glob(f"{poe_path}/hwmon*/name"):
            name = Path(hwmon).read_text().strip()
            if "rpi_poe" in name.lower():
                parent = os.path.dirname(hwmon)
                fan = _int(_read_ps(parent, "fan1_input"))
                return {
                    "available": True,
                    "source":    "poe",
                    "name":      "RPi PoE HAT",
                    "type":      "PoE",
                    "percent":   100,
                    "voltage":   48.0,   # PoE standard 48V
                    "current_ma": None,
                    "power_w":   None,
                    "status":    "poe_actif",
                    "ac_online": True,
                    "charging":  False,
                    "full":      True,
                    "fan_rpm":   fan,
                }
    except Exception:
        pass
    return None


# ── Monitor principal ─────────────────────────────────────────────────────────

class BatteryMonitor:

    def __init__(self):
        self._source = self._detect_source()
        self._history: list[dict] = []   # historique pour graphique
        log.info("Battery source: %s", self._source)

    def _detect_source(self) -> str:
        if _sysfs_snapshot():   return "sysfs"
        if _poe_snapshot():     return "poe"
        if _HAS_INA:            return "ina219"
        return "simulation"

    def snapshot(self) -> dict:
        data = None

        if self._source == "sysfs":
            data = _sysfs_snapshot()
        elif self._source == "poe":
            data = _poe_snapshot()
        elif self._source == "ina219":
            data = _ina219_snapshot()

        if not data:
            data = self._simulate()

        # Historique voltage (30 derniers points)
        if data.get("voltage"):
            self._history.append({
                "t": int(time.time()),
                "v": data["voltage"],
                "p": data.get("percent"),
            })
            self._history = self._history[-30:]

        data["history"] = self._history
        return data

    def _simulate(self) -> dict:
        import math, time as _time
        t   = _time.time()
        pct = int(55 + 40 * math.sin(t / 60))   # oscille entre 15% et 95%
        v   = round(3.0 + (pct / 100) * 1.2, 2)
        return {
            "available":    False,
            "source":       "simulation",
            "name":         "Simulation",
            "type":         "LiPo",
            "percent":      pct,
            "voltage":      v,
            "current_ma":   150.0,
            "power_w":      round(v * 0.15, 2),
            "status":       "simulation",
            "ac_online":    True,
            "charging":     False,
            "full":         pct >= 95,
        }

    def get_history(self) -> list:
        return self._history
