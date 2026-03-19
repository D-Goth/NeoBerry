"""
NeoBerry v2 — core/storage.py
Storage monitoring: disk usage, read/write throughput.
"""

import time
import logging

try:
    import psutil
    _HAS_PSUTIL = True
except ImportError:
    _HAS_PSUTIL = False

log = logging.getLogger("neoberry.storage")


class StorageMonitor:

    def __init__(self):
        self._last_read  = 0
        self._last_write = 0
        self._last_time  = time.time()
        if _HAS_PSUTIL:
            c = psutil.disk_io_counters()
            if c:
                self._last_read  = c.read_bytes
                self._last_write = c.write_bytes

    def disk_usage(self, path: str = "/") -> dict:
        if not _HAS_PSUTIL:
            return {"total": 0, "used": 0, "free": 0, "percent": 0.0}
        d = psutil.disk_usage(path)
        return {
            "total":   d.total,
            "used":    d.used,
            "free":    d.free,
            "percent": d.percent,
        }

    def io_throughput(self) -> dict:
        """Return read/write throughput in bytes/s since last call."""
        if not _HAS_PSUTIL:
            return {"read": 0.0, "write": 0.0}

        c = psutil.disk_io_counters()
        if not c:
            return {"read": 0.0, "write": 0.0}

        now   = time.time()
        delta = max(now - self._last_time, 0.001)

        read_rate  = (c.read_bytes  - self._last_read)  / delta
        write_rate = (c.write_bytes - self._last_write) / delta

        self._last_read  = c.read_bytes
        self._last_write = c.write_bytes
        self._last_time  = now

        return {"read": round(read_rate, 1), "write": round(write_rate, 1)}

    def snapshot(self) -> dict:
        return {
            "disk":       self.disk_usage("/"),
            "throughput": self.io_throughput(),
        }
