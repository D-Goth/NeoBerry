"""
NeoBerry v2 — core/battery.py
Détection alimentation RPi — par ordre de priorité :
  1. psutil.sensors_battery()    (UPS HAT génériques)
  2. upower                      (fallback Linux)
  3. /sys/class/power_supply     (sysfs)
  4. INA219 (I2C)
  5. PoE HAT
Sans batterie détectée :
  - RPi (vcgencmd présent) → mode "mains" : statut secteur via get_throttled
  - Hors RPi               → mode "simulation" (batterie fictive, dev)
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
    """Registre get_throttled décodé (bits 0-3 = état actuel, 16-19 = depuis le boot)."""
    if not shutil.which("vcgencmd"):
        return {"available": False}
    try:
        out  = subprocess.check_output(["vcgencmd", "get_throttled"], timeout=2, text=True)
        code = int(out.strip().split("=")[1], 16)
    except Exception:
        return {"available": False}

    under_now    = bool(code & 0x1)
    capped_now   = bool(code & 0x2)
    throttle_now = bool(code & 0x4)
    under_boot   = bool(code & 0x10000)

    if under_now:
        status, label = "bad", "Sous-tension en cours"
    elif capped_now or throttle_now:
        status, label = "warn", "Fréquence limitée"
    else:
        status, label = "ok", "Tension OK"

    return {
        "available":    True,
        "raw":          hex(code),
        "status":       status,
        "label":        label,
        "under_now":    under_now,
        "under_boot":   under_boot,
        "throttle_now": throttle_now or capped_now,
    }


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

    SAMPLE_EVERY = 30      # secondes entre deux points de la frise
    TIMELINE_LEN = 120     # 120 × 30 s = 1 heure
    MAX_EVENTS   = 10

    _RANK = {"ok": 0, "warn": 1, "bad": 2}

    def __init__(self):
        self._history: list[dict] = []
        self._timeline: list[str] = []
        self._events: list[int] = []
        self._event_count = 0
        self._was_under = False
        self._bucket_worst = None
        self._bucket_start = time.time()
        self._is_rpi = shutil.which("vcgencmd") is not None
        log.info("Battery init — RPi: %s", self._is_rpi)

    def _track_power(self, thr: dict) -> None:
        if not thr.get("available"):
            return
        now = time.time()

        if thr["under_now"] and not self._was_under:
            self._event_count += 1
            self._events.append(int(now))
            self._events = self._events[-self.MAX_EVENTS:]
        self._was_under = thr["under_now"]

        st = thr["status"]
        if self._bucket_worst is None or self._RANK[st] > self._RANK[self._bucket_worst]:
            self._bucket_worst = st

        if now - self._bucket_start >= self.SAMPLE_EVERY or not self._timeline:
            self._timeline.append(self._bucket_worst)
            self._timeline = self._timeline[-self.TIMELINE_LEN:]
            self._bucket_worst = None
            self._bucket_start = now

    def _power_block(self, thr: dict) -> dict:
        return {
            "throttled":      thr,
            "core_voltage":   _vcgencmd_volts(),
            "timeline":       self._timeline,
            "sample_every":   self.SAMPLE_EVERY,
            "events":         self._events,
            "event_count":    self._event_count,
        }

    def snapshot(self) -> dict:
        thr = _vcgencmd_throttled()
        self._track_power(thr)

        data = (
            _psutil_battery()  or
            _upower_battery()  or
            _sysfs_battery()   or
            _ina219_battery()  or
            _poe_battery()
        )

        if data:
            data["mode"] = "battery"
        elif self._is_rpi:
            data = {"mode": "mains", "available": True, "source": "secteur"}
        else:
            data = _simulate()
            data["mode"] = "simulation"

        data["power"] = self._power_block(thr)

        if data["mode"] != "mains" and data.get("voltage"):
            self._history.append({"t": int(time.time()), "v": data["voltage"],
                                  "p": data.get("percent")})
            self._history = self._history[-30:]
        data["history"] = self._history

        return data

    def get_history(self) -> list:
        return self._history
