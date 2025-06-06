# AIRSPY

A minimalist web interface to scan Wi-Fi networks, display connected clients, and deauth.

## Launch

```bash
sudo python airspy.py [PORT]
```

If no port is specified, the server defaults to port 5000.
You can replace `[PORT]` with any valid port number.

## Requirements

```bash
pip install flask requests
```

## System Dependencies

* airodump-ng
* iwconfig
* pkill
* A Wi-Fi interface in monitor mode
