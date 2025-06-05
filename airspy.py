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
    results = scan_wifi(10, iface=iface)
    return jsonify(results)

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
