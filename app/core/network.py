"""
NeoBerry v2 — core/network.py
Network monitoring: bandwidth, interface status, internet connectivity.
"""

import time
import logging
import socket

try:
    import psutil
    _HAS_PSUTIL = True
except ImportError:
    _HAS_PSUTIL = False

log = logging.getLogger("neoberry.network")


class NetworkMonitor:

    def __init__(self):
        self._last_bytes_sent = 0
        self._last_bytes_recv = 0
        self._last_time = time.time()
        if _HAS_PSUTIL:
            c = psutil.net_io_counters()
            self._last_bytes_sent = c.bytes_sent
            self._last_bytes_recv = c.bytes_recv

    def bandwidth(self) -> dict:
        """Return upload/download in bytes/s since last call."""
        if not _HAS_PSUTIL:
            return {"upload": 0.0, "download": 0.0}

        now   = time.time()
        delta = max(now - self._last_time, 0.001)
        c = psutil.net_io_counters()

        upload   = (c.bytes_sent - self._last_bytes_sent) / delta
        download = (c.bytes_recv - self._last_bytes_recv) / delta

        self._last_bytes_sent = c.bytes_sent
        self._last_bytes_recv = c.bytes_recv
        self._last_time = now

        return {"upload": round(upload, 1), "download": round(download, 1)}

    def interfaces(self) -> list[dict]:
        """Return active network interfaces with their IP addresses."""
        if not _HAS_PSUTIL:
            return []
        addrs = psutil.net_if_addrs()
        stats = psutil.net_if_stats()
        result = []
        for iface, addr_list in addrs.items():
            if iface == "lo":
                continue
            ipv4 = next((a.address for a in addr_list if a.family == 2), None)
            is_up = stats.get(iface, None)
            result.append({
                "name":  iface,
                "ip":    ipv4 or "",
                "up":    is_up.isup if is_up else False,
                "speed": is_up.speed if is_up else 0,
            })
        return result

    def internet_reachable(self, host: str = "1.1.1.1", port: int = 53) -> bool:
        try:
            socket.setdefaulttimeout(1)
            socket.socket(socket.AF_INET, socket.SOCK_STREAM).connect((host, port))
            return True
        except Exception:
            return False

    def snapshot(self) -> dict:
        return {
            "bandwidth":  self.bandwidth(),
            "interfaces": self.interfaces(),
            "internet":   self.internet_reachable(),
        }
