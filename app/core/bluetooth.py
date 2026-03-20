"""
NeoBerry v2 — core/bluetooth.py
Full Bluetooth management via BlueZ (dbus).
Falls back to a simulation stub when BlueZ / dbus is unavailable (dev mode).
"""

import logging
import threading
import time

log = logging.getLogger("neoberry.bluetooth")

# ── BlueZ / dbus import (optional) ───────────────────────────────────────────

try:
    import dbus
    import dbus.mainloop.glib
    from gi.repository import GLib

    dbus.mainloop.glib.DBusGMainLoop(set_as_default=True)
    _BUS          = dbus.SystemBus()
    _BLUEZ_SVC    = "org.bluez"
    _ADAPTER_PATH = "/org/bluez/hci0"
    _HAS_BLUEZ    = True
    log.info("BlueZ / dbus available — real Bluetooth mode")
except Exception:
    _HAS_BLUEZ = False
    log.warning("BlueZ / dbus not available — Bluetooth simulation mode")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _iface(path: str, iface: str):
    obj = _BUS.get_object(_BLUEZ_SVC, path)
    return dbus.Interface(obj, iface)


def _props(path: str):
    obj = _BUS.get_object(_BLUEZ_SVC, path)
    return dbus.Interface(obj, "org.freedesktop.DBus.Properties")


def _get_managed_objects() -> dict:
    manager = _iface("/", "org.freedesktop.DBus.ObjectManager")
    return manager.GetManagedObjects()


def _device_to_dict(path: str, props: dict) -> dict:
    dp = dict(props.get("org.bluez.Device1", {}))
    return {
        "path":      str(path),
        "address":   str(dp.get("Address",   "")),
        "name":      str(dp.get("Name",      dp.get("Alias", "Unknown"))),
        "paired":    bool(dp.get("Paired",   False)),
        "connected": bool(dp.get("Connected",False)),
        "trusted":   bool(dp.get("Trusted",  False)),
        "rssi":      int( dp.get("RSSI",     -100)),
        "class":     int( dp.get("Class",    0)),
        "icon":      str( dp.get("Icon",     "")),
        "services":  [str(u) for u in dp.get("UUIDs", [])],
    }


# ── Manager ───────────────────────────────────────────────────────────────────

class BluetoothManager:
    """
    Manages Bluetooth state via BlueZ over dbus.
    All public methods return a dict { ok: bool, ... }.
    """

    def __init__(self):
        self._scan_thread: threading.Thread | None = None
        self._scanning  = False
        self._mainloop: "GLib.MainLoop | None" = None
        self._sim_devices: list[dict] = []   # used in sim mode only

        if not _HAS_BLUEZ:
            self._init_sim()

    # ── Simulation ───────────────────────────────────────────────────────────

    def _init_sim(self):
        """Populate fake devices for dev/test mode."""
        self._sim_devices = [
            {
                "path": "/org/bluez/hci0/dev_AA_BB_CC_DD_EE_01",
                "address": "AA:BB:CC:DD:EE:01",
                "name": "Sony WH-1000XM5",
                "paired": True, "connected": False,
                "trusted": True, "rssi": -55,
                "class": 0x240404, "icon": "audio-headphones",
                "services": ["0000110b-0000-1000-8000-00805f9b34fb"],
            },
            {
                "path": "/org/bluez/hci0/dev_AA_BB_CC_DD_EE_02",
                "address": "AA:BB:CC:DD:EE:02",
                "name": "Logitech MX Master 3",
                "paired": True, "connected": True,
                "trusted": True, "rssi": -42,
                "class": 0x002580, "icon": "input-mouse",
                "services": ["00001124-0000-1000-8000-00805f9b34fb"],
            },
        ]
        self._sim_power = True

    # ── Power ─────────────────────────────────────────────────────────────────

    def set_power(self, on: bool) -> dict:
        if not _HAS_BLUEZ:
            self._sim_power = on
            log.info("[SIM] Bluetooth power → %s", on)
            return {"ok": True, "power": on}
        try:
            p = _props(_ADAPTER_PATH)
            p.Set("org.bluez.Adapter1", "Powered", dbus.Boolean(on))
            log.info("Bluetooth power → %s", on)
            return {"ok": True, "power": on}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def get_power(self) -> bool:
        if not _HAS_BLUEZ:
            return self._sim_power
        try:
            p = _props(_ADAPTER_PATH)
            return bool(p.Get("org.bluez.Adapter1", "Powered"))
        except Exception:
            return False

    # ── Scan ──────────────────────────────────────────────────────────────────

    def start_scan(self, callback=None, duration: int = 30) -> dict:
        """
        Start device discovery.
        callback(device_dict) is called for each new device found.
        Scan auto-stops after `duration` seconds.
        """
        if self._scanning:
            return {"ok": False, "error": "Already scanning"}

        if not _HAS_BLUEZ:
            self._scanning = True
            self._scan_thread = threading.Thread(
                target=self._sim_scan, args=(callback, duration), daemon=True
            )
            self._scan_thread.start()
            return {"ok": True, "scanning": True}

        try:
            adapter = _iface(_ADAPTER_PATH, "org.bluez.Adapter1")
            adapter.StartDiscovery()
            self._scanning = True

            def _watch():
                seen = set()
                deadline = time.time() + duration
                while self._scanning and time.time() < deadline:
                    try:
                        objs = _get_managed_objects()
                        for path, ifaces in objs.items():
                            if "org.bluez.Device1" not in ifaces:
                                continue
                            if path in seen:
                                continue
                            seen.add(path)
                            dev = _device_to_dict(path, ifaces)
                            if callback:
                                callback(dev)
                    except Exception as exc:
                        log.debug("Scan watch error: %s", exc)
                    time.sleep(1)
                self.stop_scan()

            self._scan_thread = threading.Thread(target=_watch, daemon=True)
            self._scan_thread.start()
            return {"ok": True, "scanning": True}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def _sim_scan(self, callback, duration):
        """Simulate device discovery for dev mode."""
        fake = [
            {"path": "/org/bluez/hci0/dev_FF_EE_DD_CC_BB_01",
             "address": "FF:EE:DD:CC:BB:01", "name": "JBL Flip 6",
             "paired": False, "connected": False, "trusted": False,
             "rssi": -72, "class": 0x240414, "icon": "audio-speakers", "services": []},
            {"path": "/org/bluez/hci0/dev_FF_EE_DD_CC_BB_02",
             "address": "FF:EE:DD:CC:BB:02", "name": "iPhone de Marie",
             "paired": False, "connected": False, "trusted": False,
             "rssi": -85, "class": 0x5a020c, "icon": "phone", "services": []},
            {"path": "/org/bluez/hci0/dev_FF_EE_DD_CC_BB_03",
             "address": "FF:EE:DD:CC:BB:03", "name": "Keyboard BT Pro",
             "paired": False, "connected": False, "trusted": False,
             "rssi": -61, "class": 0x002540, "icon": "input-keyboard", "services": []},
        ]
        deadline = time.time() + duration
        for dev in fake:
            if not self._scanning or time.time() > deadline:
                break
            time.sleep(2)
            if callback:
                callback(dev)
        self._scanning = False

    def stop_scan(self) -> dict:
        self._scanning = False
        if not _HAS_BLUEZ:
            return {"ok": True, "scanning": False}
        try:
            adapter = _iface(_ADAPTER_PATH, "org.bluez.Adapter1")
            adapter.StopDiscovery()
            return {"ok": True, "scanning": False}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # ── Pair ──────────────────────────────────────────────────────────────────

    def pair(self, address: str) -> dict:
        if not _HAS_BLUEZ:
            for dev in self._sim_devices:
                if dev["address"] == address:
                    dev["paired"] = True
                    dev["trusted"] = True
                    return {"ok": True, "address": address}
            return {"ok": False, "error": "Device not found"}
        try:
            path   = self._address_to_path(address)
            device = _iface(path, "org.bluez.Device1")
            device.Pair()
            # Trust automatically after pairing
            p = _props(path)
            p.Set("org.bluez.Device1", "Trusted", dbus.Boolean(True))
            return {"ok": True, "address": address}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # ── Connect / Disconnect ──────────────────────────────────────────────────

    def connect(self, address: str) -> dict:
        if not _HAS_BLUEZ:
            for dev in self._sim_devices:
                if dev["address"] == address:
                    dev["connected"] = True
                    return {"ok": True, "address": address}
            return {"ok": False, "error": "Device not found"}
        try:
            device = _iface(self._address_to_path(address), "org.bluez.Device1")
            device.Connect()
            return {"ok": True, "address": address}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def disconnect(self, address: str) -> dict:
        if not _HAS_BLUEZ:
            for dev in self._sim_devices:
                if dev["address"] == address:
                    dev["connected"] = False
                    return {"ok": True, "address": address}
            return {"ok": False, "error": "Device not found"}
        try:
            device = _iface(self._address_to_path(address), "org.bluez.Device1")
            device.Disconnect()
            return {"ok": True, "address": address}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # ── Remove / Trust ────────────────────────────────────────────────────────

    def remove(self, address: str) -> dict:
        if not _HAS_BLUEZ:
            self._sim_devices = [d for d in self._sim_devices if d["address"] != address]
            return {"ok": True}
        try:
            adapter = _iface(_ADAPTER_PATH, "org.bluez.Adapter1")
            adapter.RemoveDevice(self._address_to_path(address))
            return {"ok": True}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # ── Send data (RFCOMM / SPP) ──────────────────────────────────────────────

    def send_data(self, address: str, data: str) -> dict:
        """
        Send data to a connected device via RFCOMM (Serial Port Profile).
        Falls back to simulation in dev mode.
        """
        if not _HAS_BLUEZ:
            log.info("[SIM] Sending to %s: %s", address, data)
            return {"ok": True, "bytes_sent": len(data.encode())}
        try:
            import socket as _socket
            sock = _socket.socket(
                _socket.AF_BLUETOOTH, _socket.SOCK_STREAM, _socket.BTPROTO_RFCOMM
            )
            sock.settimeout(5)
            sock.connect((address, 1))   # RFCOMM channel 1
            encoded = data.encode("utf-8")
            sock.send(encoded)
            sock.close()
            return {"ok": True, "bytes_sent": len(encoded)}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # ── Enumerate devices ─────────────────────────────────────────────────────

    def list_paired(self) -> list[dict]:
        if not _HAS_BLUEZ:
            return [d for d in self._sim_devices if d["paired"]]
        try:
            objs    = _get_managed_objects()
            devices = []
            for path, ifaces in objs.items():
                if "org.bluez.Device1" not in ifaces:
                    continue
                dev = _device_to_dict(path, ifaces)
                if dev["paired"]:
                    devices.append(dev)
            return devices
        except Exception as e:
            log.error("list_paired error: %s", e)
            return []

    def list_all(self) -> list[dict]:
        """Return all known devices (paired + recently seen)."""
        if not _HAS_BLUEZ:
            return self._sim_devices
        try:
            objs    = _get_managed_objects()
            return [
                _device_to_dict(path, ifaces)
                for path, ifaces in objs.items()
                if "org.bluez.Device1" in ifaces
            ]
        except Exception:
            return []

    # ── RSSI live ─────────────────────────────────────────────────────────────

    def get_rssi(self, address: str) -> int | None:
        if not _HAS_BLUEZ:
            for d in self._sim_devices:
                if d["address"] == address:
                    return d["rssi"]
            return None
        try:
            p = _props(self._address_to_path(address))
            return int(p.Get("org.bluez.Device1", "RSSI"))
        except Exception:
            return None

    # ── Snapshot (for WebSocket initial push) ─────────────────────────────────

    def snapshot(self) -> dict:
        return {
            "power":    self.get_power(),
            "scanning": self._scanning,
            "paired":   self.list_paired(),
        }

    # ── Internal helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _address_to_path(address: str) -> str:
        """Convert MAC address to BlueZ dbus object path."""
        mac = address.replace(":", "_")
        return f"{_ADAPTER_PATH}/dev_{mac}"
