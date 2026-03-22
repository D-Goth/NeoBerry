"""
NeoBerry v2 — core/battery.py
Détection alimentation RPi — par ordre de priorité :
  1. psutil.sensors_battery()    (UPS HAT génériques)
  2. upower                      (fallback Linux)
  3. /sys/class/power_supply     (sysfs)
  4. INA219 (I2C)
  5. PoE HAT
  6. vcgencmd measure_volts      (tension brute RPi — toujours dispo)
  7. Simulation
"""

import os, glob, logging, time, subprocess, shutil
from pathlib import Path

log = logging.getLogger("neoberry.battery")

try:
    import psutil
    _HAS_PSUTIL = True
except ImportError:
    _HAS_PSUTIL = False

try:
    from ina219 import INA219 as _INA219, DeviceRangeError
    _HAS_INA = True
except ImportError:
    _HAS_INA = False


# ── vcgencmd : tension réelle du Pi ──────────────────────────────────────────

def _vcgencmd_volts() -> float | None:
    """Lit la tension core via vcgencmd measure_volts (RPi uniquement)."""
    if not shutil.which("vcgencmd"):
        return None
    try:
        out = subprocess.check_output(
            ["vcgencmd", "measure_volts", "core"], timeout=2, text=True
        )
        # retourne "volt=1.2000V"
        return round(float(out.strip().split("=")[1].replace("V", "")), 3)
    except Exception:
        return None


def _vcgencmd_throttled() -> dict:
    """Statut tension via registre throttling."""
    if not shutil.which("vcgencmd"):
        return {"available": False}
    try:
        out   = subprocess.check_output(["vcgencmd", "get_throttled"], timeout=2, text=True)
        code  = int(out.strip().split("=")[1], 16)
        if code == 0x0:
            return {"available": True, "status": "ok",   "label": "🟢 Tension OK"}
        elif code & 0x1:
            return {"available": True, "status": "bad",  "label": "🔴 Sous-tension"}
        else:
            return {"available": True, "status": "warn", "label": "🟡 Tension instable"}
    except Exception:
        return {"available": False}


# ── psutil sensors_battery ────────────────────────────────────────────────────

def _psutil_battery() -> dict | None:
    if not _HAS_PSUTIL:
        return None
    try:
        b = psutil.sensors_battery()
        if b is None:
            return None
        secsleft = b.secsleft if b.secsleft not in (
            psutil.POWER_TIME_UNKNOWN, psutil.POWER_TIME_UNLIMITED
        ) else None
        return {
            "available":  True,
            "source":     "psutil",
            "name":       "Batterie système",
            "type":       "Battery",
            "percent":    round(b.percent, 1),
            "voltage":    None,
            "current_ma": None,
            "power_w":    None,
            "status":     "charge" if b.power_plugged and b.percent < 100
                          else "plein" if b.power_plugged
                          else "decharge",
            "ac_online":  b.power_plugged,
            "charging":   b.power_plugged and b.percent < 100,
            "full":       b.percent >= 100,
            "secsleft":   secsleft,
        }
    except Exception:
        return None


# ── upower fallback ───────────────────────────────────────────────────────────

def _upower_battery() -> dict | None:
    if not shutil.which("upower"):
        return None
    try:
        devices = subprocess.check_output(
            ["upower", "-e"], timeout=3, text=True
        ).strip().splitlines()
        dev = next((d for d in devices if "battery" in d.lower()), None)
        if not dev:
            return None
        info = subprocess.check_output(
            ["upower", "-i", dev], timeout=3, text=True
        )
        pct, state, voltage = None, "unknown", None
        for line in info.splitlines():
            if "percentage" in line:
                try: pct = float(line.split()[-1].replace("%",""))
                except: pass
            if "state:" in line:
                state = line.split()[-1].strip()
            if "voltage" in line:
                try: voltage = float(line.split()[-1].replace("V",""))
                except: pass
        if pct is None:
            return None
        plugged = state in ("charging", "fully-charged", "pending-charge")
        return {
            "available":  True,
            "source":     "upower",
            "name":       os.path.basename(dev),
            "type":       "Battery",
            "percent":    round(pct, 1),
            "voltage":    voltage,
            "current_ma": None,
            "power_w":    None,
            "status":     "charge" if state == "charging"
                          else "plein" if state == "fully-charged"
                          else "decharge",
            "ac_online":  plugged,
            "charging":   state == "charging",
            "full":       state == "fully-charged",
        }
    except Exception:
        return None


# ── sysfs power_supply ────────────────────────────────────────────────────────

def _read_ps(path, attr):
    try: return Path(f"{path}/{attr}").read_text().strip()
    except: return None

def _sysfs_battery() -> dict | None:
    batteries = [s for s in glob.glob("/sys/class/power_supply/*")
                 if _read_ps(s, "type") in ("Battery", "UPS")]
    if not batteries:
        return None
    bp = batteries[0]
    cap = _read_ps(bp, "capacity")
    pct = int(cap) if cap else None
    volt_raw = _read_ps(bp, "voltage_now")
    voltage  = round(int(volt_raw) / 1_000_000, 3) if volt_raw else None
    curr_raw = _read_ps(bp, "current_now")
    current  = round(abs(int(curr_raw)) / 1000, 1) if curr_raw else None
    status_raw = _read_ps(bp, "status") or "Unknown"
    status_map = {"Charging":"charge","Discharging":"decharge",
                  "Full":"plein","Not charging":"pas_charge"}
    ac = any(_read_ps(s,"online")=="1"
             for s in glob.glob("/sys/class/power_supply/*")
             if _read_ps(s,"type") in ("Mains","USB"))
    return {
        "available": True, "source": "sysfs",
        "name": _read_ps(bp,"model_name") or os.path.basename(bp),
        "type": _read_ps(bp,"type") or "Battery",
        "percent": pct, "voltage": voltage, "current_ma": current,
        "power_w": round(voltage * current / 1000, 2) if voltage and current else None,
        "status": status_map.get(status_raw, status_raw.lower()),
        "ac_online": ac, "charging": status_raw == "Charging",
        "full": status_raw == "Full",
    }


# ── INA219 ────────────────────────────────────────────────────────────────────

def _ina219_battery() -> dict | None:
    if not _HAS_INA:
        return None
    try:
        ina = _INA219(0.1)
        ina.configure()
        voltage = round(ina.voltage(), 3)
        try:
            current = round(ina.current(), 1)
            power   = round(ina.power() / 1000, 2)
        except: current = power = None
        pct = max(0, min(100, int((voltage - 3.0) / 1.2 * 100)))
        return {
            "available": True, "source": "ina219", "name": "INA219",
            "type": "LiPo", "percent": pct, "voltage": voltage,
            "current_ma": current, "power_w": power,
            "status": "mesure", "ac_online": None,
            "charging": current > 0 if current else None,
            "full": pct >= 95,
        }
    except Exception:
        return None


# ── PoE HAT ───────────────────────────────────────────────────────────────────

def _poe_battery() -> dict | None:
    for hwmon in glob.glob("/sys/class/hwmon/hwmon*/name"):
        try:
            if "rpi_poe" in Path(hwmon).read_text().strip().lower():
                return {
                    "available": True, "source": "poe", "name": "RPi PoE HAT",
                    "type": "PoE", "percent": 100, "voltage": 48.0,
                    "current_ma": None, "power_w": None,
                    "status": "poe_actif", "ac_online": True,
                    "charging": False, "full": True,
                }
        except: pass
    return None


# ── Simulation ────────────────────────────────────────────────────────────────

def _simulate() -> dict:
    import math
    t   = time.time()
    pct = int(55 + 40 * math.sin(t / 60))
    v   = round(3.0 + (pct / 100) * 1.2, 3)
    return {
        "available": False, "source": "simulation", "name": "Simulation",
        "type": "LiPo", "percent": pct, "voltage": v,
        "current_ma": 150.0, "power_w": round(v * 0.15, 2),
        "status": "simulation", "ac_online": True,
        "charging": False, "full": pct >= 95,
    }


# ── Monitor ───────────────────────────────────────────────────────────────────

class BatteryMonitor:

    def __init__(self):
        self._history: list[dict] = []
        self._volt_status = _vcgencmd_throttled()
        log.info("Battery init — vcgencmd: %s", self._volt_status)

    def snapshot(self) -> dict:
        # Ordre de priorité
        data = (
            _psutil_battery()  or
            _upower_battery()  or
            _sysfs_battery()   or
            _ina219_battery()  or
            _poe_battery()
        )

        # Si aucune batterie détectée, on retourne quand même la tension RPi
        if not data:
            data = _simulate()

        # Toujours enrichir avec la tension vcgencmd si dispo (RPi nu)
        vcg_volt = _vcgencmd_volts()
        if vcg_volt and not data.get("voltage"):
            data["voltage"] = vcg_volt

        # Statut tension alimentation
        data["volt_status"] = self._volt_status

        # Historique
        if data.get("voltage"):
            self._history.append({"t": int(time.time()), "v": data["voltage"],
                                   "p": data.get("percent")})
            self._history = self._history[-30:]
        data["history"] = self._history

        return data

    def get_history(self) -> list:
        return self._history
