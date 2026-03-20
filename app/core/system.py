"""
NeoBerry v2 — core/system.py
+ Fréquence CPU (MHz), Top 5 processus, Throttling RPi, Swap
"""

import platform, subprocess, time, logging
from datetime import timedelta

try:
    import psutil
    _HAS_PSUTIL = True
except ImportError:
    _HAS_PSUTIL = False

log = logging.getLogger("neoberry.system")
_BOOT_TIME = time.time()

_THROTTLE_FLAGS = {
    0:  "Sous-tension détectée",
    1:  "Fréquence limitée (arm)",
    2:  "Throttling actif",
    3:  "Température limite atteinte",
    16: "Sous-tension s'est produite",
    17: "Fréquence limitée s'est produite",
    18: "Throttling s'est produit",
    19: "Température limite s'est produite",
}


def _read_file(path):
    try:
        with open(path) as f: return f.read().strip()
    except Exception: return None


class SystemMonitor:

    def cpu_percent(self, interval=0.1):
        return psutil.cpu_percent(interval=interval) if _HAS_PSUTIL else 0.0

    def cpu_freq(self):
        if _HAS_PSUTIL:
            try:
                f = psutil.cpu_freq()
                if f: return {"current": round(f.current,1), "min": round(f.min,1), "max": round(f.max,1)}
            except Exception: pass
        try:
            out = subprocess.check_output(["vcgencmd","measure_clock","arm"], timeout=2, text=True)
            mhz = round(int(out.strip().split("=")[1]) / 1_000_000, 1)
            return {"current": mhz, "min": None, "max": None}
        except Exception: pass
        raw = _read_file("/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq")
        if raw:
            try: return {"current": round(int(raw)/1000,1), "min": None, "max": None}
            except ValueError: pass
        return None

    def cpu_temperature(self):
        if _HAS_PSUTIL:
            try:
                temps = psutil.sensors_temperatures()
                for key in ("cpu_thermal","coretemp","acpitz","cpu-thermal"):
                    if key in temps and temps[key]: return temps[key][0].current
            except Exception: pass
        raw = _read_file("/sys/class/thermal/thermal_zone0/temp")
        if raw:
            try: return int(raw)/1000.0
            except ValueError: pass
        try:
            out = subprocess.check_output(["vcgencmd","measure_temp"], timeout=2, text=True)
            return float(out.strip().split("=")[1].replace("'C",""))
        except Exception: return None

    def card_temperature(self):
        try:
            out = subprocess.check_output(["vcgencmd","measure_temp","pmic"], timeout=2, text=True)
            return float(out.strip().split("=")[1].replace("'C",""))
        except Exception: return None

    def ram(self):
        if not _HAS_PSUTIL: return {"total":0,"used":0,"free":0,"percent":0.0}
        m = psutil.virtual_memory()
        return {"total":m.total,"used":m.used,"free":m.available,"percent":m.percent}

    def swap(self):
        if not _HAS_PSUTIL: return None
        try:
            s = psutil.swap_memory()
            if s.total == 0: return {"total":0,"used":0,"percent":0.0,"available":False}
            return {"total":s.total,"used":s.used,"free":s.free,"percent":s.percent,"available":True}
        except Exception: return None

    def top_processes(self, n=5):
        if not _HAS_PSUTIL: return []
        try:
            procs = []
            for p in psutil.process_iter(["pid","name","cpu_percent","memory_percent","status"]):
                try:
                    i = p.info
                    if i["status"] == psutil.STATUS_ZOMBIE: continue
                    procs.append({"pid":i["pid"],"name":(i["name"] or "?")[:20],
                                  "cpu":round(i["cpu_percent"] or 0,1),
                                  "mem":round(i["memory_percent"] or 0,1)})
                except (psutil.NoSuchProcess, psutil.AccessDenied): pass
            procs.sort(key=lambda x:(x["cpu"],x["mem"]), reverse=True)
            return procs[:n]
        except Exception: return []

    def throttling(self):
        try:
            out   = subprocess.check_output(["vcgencmd","get_throttled"], timeout=2, text=True)
            hexv  = out.strip().split("=")[1]
            value = int(hexv, 16)
            flags = [{"bit":b,"label":l,"current":b<16}
                     for b,l in _THROTTLE_FLAGS.items() if value & (1<<b)]
            return {"available":True,"ok":value==0,"raw":hexv,"value":value,
                    "undervoltage":bool(value&0x1),"throttled":bool(value&0x4),"flags":flags}
        except FileNotFoundError: return {"available":False}
        except Exception as e:    return {"available":False,"error":str(e)}

    def uptime(self):
        boot_ts = psutil.boot_time() if _HAS_PSUTIL else _BOOT_TIME
        delta   = timedelta(seconds=int(time.time()-boot_ts))
        days    = delta.days
        h, rem  = divmod(delta.seconds, 3600)
        m, _    = divmod(rem, 60)
        parts   = []
        if days: parts.append(f"{days}j")
        if h:    parts.append(f"{h}h")
        parts.append(f"{m}min")
        return " ".join(parts)

    def os_info(self):
        uname = platform.uname()
        host  = (_read_file("/etc/hostname") or uname.node).strip()
        upd   = None
        try:
            out = subprocess.check_output(["stat","-c","%y","/var/lib/dpkg/info"], timeout=2, text=True)
            upd = out.strip()[:10]
        except Exception: pass
        return {"os":f"{uname.system} {uname.release}","hostname":host,
                "architecture":uname.machine,"last_update":upd}

    def snapshot(self):
        return {
            "cpu_percent": self.cpu_percent(),
            "cpu_temp":    self.cpu_temperature(),
            "cpu_freq":    self.cpu_freq(),
            "card_temp":   self.card_temperature(),
            "ram":         self.ram(),
            "swap":        self.swap(),
            "uptime":      self.uptime(),
            "throttling":  self.throttling(),
            "top_procs":   self.top_processes(),
        }

    def full_info(self):
        snap = self.snapshot()
        snap["os"] = self.os_info()
        return snap
