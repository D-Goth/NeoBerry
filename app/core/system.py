"""
NeoBerry v2 — core/system.py
System metrics: CPU, RAM, temperature, uptime, OS info.
Uses psutil exclusively — works on any Linux host, not just RPi.
"""

import platform
import subprocess
import time
import logging
from datetime import datetime, timedelta

try:
    import psutil
    _HAS_PSUTIL = True
except ImportError:
    _HAS_PSUTIL = False

log = logging.getLogger("neoberry.system")

_BOOT_TIME = time.time()


def _read_file(path: str) -> str | None:
    try:
        with open(path) as f:
            return f.read().strip()
    except Exception:
        return None


class SystemMonitor:

    def cpu_percent(self, interval: float = 0.1) -> float:
        if _HAS_PSUTIL:
            return psutil.cpu_percent(interval=interval)
        return 0.0

    def cpu_temperature(self) -> float | None:
        """
        Try multiple methods to get CPU temperature:
        1. psutil sensors (works on many Linux distros)
        2. /sys/class/thermal/thermal_zone0/temp (RPi default)
        3. vcgencmd (Raspberry Pi firmware tool)
        """
        # psutil sensors
        if _HAS_PSUTIL:
            try:
                temps = psutil.sensors_temperatures()
                for key in ("cpu_thermal", "coretemp", "acpitz", "cpu-thermal"):
                    if key in temps and temps[key]:
                        return temps[key][0].current
            except Exception:
                pass

        # Thermal zone sysfs
        raw = _read_file("/sys/class/thermal/thermal_zone0/temp")
        if raw:
            try:
                return int(raw) / 1000.0
            except ValueError:
                pass

        # vcgencmd (Raspberry Pi)
        try:
            out = subprocess.check_output(
                ["vcgencmd", "measure_temp"], timeout=2, text=True
            )
            return float(out.strip().split("=")[1].replace("'C", ""))
        except Exception:
            pass

        return None

    def card_temperature(self) -> float | None:
        """SD card / SoC temperature via vcgencmd (RPi only)."""
        try:
            out = subprocess.check_output(
                ["vcgencmd", "measure_temp", "pmic"], timeout=2, text=True
            )
            return float(out.strip().split("=")[1].replace("'C", ""))
        except Exception:
            return None

    def ram(self) -> dict:
        if not _HAS_PSUTIL:
            return {"total": 0, "used": 0, "percent": 0.0}
        m = psutil.virtual_memory()
        return {
            "total":   m.total,
            "used":    m.used,
            "free":    m.available,
            "percent": m.percent,
        }

    def uptime(self) -> str:
        if _HAS_PSUTIL:
            boot_ts = psutil.boot_time()
        else:
            boot_ts = _BOOT_TIME
        delta = timedelta(seconds=int(time.time() - boot_ts))
        days  = delta.days
        hours, rem = divmod(delta.seconds, 3600)
        mins, _    = divmod(rem, 60)
        parts = []
        if days:
            parts.append(f"{days}j")
        if hours:
            parts.append(f"{hours}h")
        parts.append(f"{mins}min")
        return " ".join(parts)

    def os_info(self) -> dict:
        uname = platform.uname()
        hostname = _read_file("/etc/hostname") or uname.node

        # Last update date from dpkg
        last_update = None
        try:
            out = subprocess.check_output(
                ["stat", "-c", "%y", "/var/lib/dpkg/info"], timeout=2, text=True
            )
            last_update = out.strip()[:10]   # YYYY-MM-DD
        except Exception:
            pass

        return {
            "os":          f"{uname.system} {uname.release}",
            "hostname":    hostname.strip(),
            "architecture": uname.machine,
            "last_update": last_update,
        }

    def snapshot(self) -> dict:
        return {
            "cpu_percent":    self.cpu_percent(),
            "cpu_temp":       self.cpu_temperature(),
            "card_temp":      self.card_temperature(),
            "ram":            self.ram(),
            "uptime":         self.uptime(),
        }

    def full_info(self) -> dict:
        snap = self.snapshot()
        snap["os"] = self.os_info()
        return snap
