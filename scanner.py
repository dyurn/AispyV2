import subprocess, time, csv, requests

def get_mac_vendor(mac_address):
    url = f"https://api.macvendors.com/{mac_address}"
    try:
        response = requests.get(url, timeout=2)
        if response.status_code == 200:
            return response.text.strip()
    except requests.RequestException:
        pass
    return "Unknown"

def scan_wifi(timeout=10, iface="wlan0"):
    print(f"[+] Scanning Wi-Fi networks with {iface}")
    csv_file = "/tmp/airodump-01.csv"
    subprocess.Popen(
        ["airodump-ng", iface, "--write", "/tmp/airodump", "--output-format", "csv"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    time.sleep(timeout)
    subprocess.run("sudo pkill airodump-ng", shell=True)

    try:
        with open(csv_file, "r", encoding="ISO-8859-1") as file:
            reader = csv.reader(file)
            rows = list(reader)
    except FileNotFoundError:
        return []

    ap_list = []
    parsing_clients = False

    for row in rows:
        if len(row) < 2:
            continue
        if "Station MAC" in row[0]:
            parsing_clients = True
            continue

        if not parsing_clients and len(row) > 13:
            try:
                bssid = row[0].strip()
                signal = int(row[8].strip()) if row[8].strip().lstrip('-').isdigit() else -100
                channel = int(row[3].strip()) if row[3].strip().isdigit() else -1
                security = row[5].strip()
                essid = row[13].strip()
                vendor = get_mac_vendor(bssid)
                ap_entry = {
                    "SSID": essid if essid else "<Hidden>",
                    "BSSID": bssid,
                    "Security": security,
                    "Vendor": vendor,
                    "Signal": signal,
                    "Channel": channel,
                    "Clients": []
                }
                ap_list.append(ap_entry)
            except:
                continue
        elif parsing_clients and len(row) > 6:
            try:
                station_mac = row[0].strip()
                associated_bssid = row[5].strip()
                signal = int(row[3].strip()) if row[3].strip().lstrip('-').isdigit() else -100
                for ap in ap_list:
                    if associated_bssid in ap["BSSID"]:
                        ap["Clients"].append({
                            "Station": station_mac,
                            "Signal": signal,
                            "Vendor": get_mac_vendor(station_mac)
                        })
                        break
            except:
                continue

    subprocess.run("rm /tmp/airodump-01.csv", shell=True)
    ap_list.pop(0)
    return ap_list
