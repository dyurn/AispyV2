let wifiChart = null;

function updateWifiChart(data) {
  const ctx = document.getElementById("wifiChart").getContext("2d");

  if (wifiChart) {
    wifiChart.destroy();
  }

  // Fonction pour générer une courbe de type cloche
  function generateGaussian(center, strength) {
    const points = [];
    for (let ch = 1; ch <= 13; ch++) {
      const distance = ch - center;
      const value = strength - Math.pow(distance * 2, 2); // parabole douce
      points.push({ x: ch, y: Math.max(value, -100) });
    }
    return points;
  }

  const datasets = data.map((ap, i) => {
    const label = ap.SSID === "<Hidden>" ? `Hidden #${i + 1}` : ap.SSID;
    const colorHue = (i * 45) % 360;
    const baseColor = `hsl(${colorHue}, 100%, 50%)`;

    return {
      label: label,
      data: generateGaussian(ap.Channel, ap.Signal),
      fill: true,
      tension: 0.4,
      borderColor: baseColor,
      backgroundColor: `hsla(${colorHue}, 100%, 50%, 0.2)`,
      pointRadius: 0,
    };
  });

  wifiChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: datasets
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          color: '#00ff00',
          font: {
            family: 'Courier New',
            size: 18
          }
        },
        legend: {
          labels: {
            color: '#00ff00',
            font: {
              family: 'Courier New',
              size: 12
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          min: 1,
          max: 13,
          title: {
            display: true,
            text: 'Channel',
            color: '#00ff00'
          },
          ticks: {
            stepSize: 1,
            color: '#00ff00'
          },
          grid: {
            color: '#003300'
          }
        },
        y: {
          min: -100,
          max: -30,
          title: {
            display: true,
            text: 'Signal (dBm)',
            color: '#00ff00'
          },
          ticks: {
            color: '#00ff00'
          },
          grid: {
            color: '#003300'
          }
        }
      }
    }
  });
}

async function loadInterfaces() {
  const select = document.getElementById("ifaceSelect");
  const button = document.querySelector("button"); // bouton Scan

  try {
    const res = await fetch("/api/interfaces");
    const interfaces = await res.json();

    if (interfaces.length === 0) {
      select.innerHTML = `<option disabled selected>No iface</option>`;
      button.disabled = true;
      button.title = "No wireless interfaces available";
    } else {
      select.innerHTML = interfaces.map(iface => `<option value="${iface}">${iface}</option>`).join("");
      button.disabled = false;
      button.title = "";
    }
  } catch (err) {
    select.innerHTML = `<option disabled selected>Error loading interfaces</option>`;
    button.disabled = true;
    button.title = "Error while loading interfaces";
  }
}


// Appelle au chargement de la page
window.addEventListener("DOMContentLoaded", loadInterfaces);


async function scanWifi() {
  const iface = document.getElementById("ifaceSelect").value;

  const button = document.querySelector("button");
  const progressContainer = document.getElementById("progressBarContainer");
  const progressBar = document.getElementById("progressBar");
  const resultsDiv = document.getElementById("results");

  // Reset
  button.disabled = true;
  button.textContent = "Scanning...";
  resultsDiv.innerHTML = "";
  progressBar.style.width = "0%";
  progressContainer.style.display = "block";

  let progress = 0;
  const interval = 100; // ms
  const maxDuration = 30000; // 15 seconds max in case of long scan
  const startTime = Date.now();

  // Animate the bar
  const progressInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const percent = Math.min((elapsed / maxDuration) * 100, 95); // cap at 95% until fetch completes
    progressBar.style.width = `${percent}%`;
  }, interval);

  try {

    const response = await fetch(`/api/wifi?iface=${encodeURIComponent(iface)}`);
    const data = await response.json();

    // Finish progress
    clearInterval(progressInterval);
    progressBar.style.width = "100%";

    // Display results
    let html = `<table>
      <thead>
        <tr>
          <th>SSID</th>
          <th>BSSID</th>
          <th>Vendor</th>
          <th>Security</th>
          <th>Signal</th>
          <th>Channel</th>
          <th>Associated Clients</th>
        </tr>
      </thead>
      <tbody>`;

    for (const ap of data) {
      let clientDetails = "None";
      if (ap.Clients.length > 0) {
        clientDetails = `<ul>` + ap.Clients.map(c => `
  <li>
    ${c.Station} <span class="client-signal">(${c.Signal} dBm)</span> | probes ${c.Vendor}
    <label class="switch">
      <input type="checkbox" 
             class="deauth-toggle" 
             data-bssid="${ap.BSSID}" 
             data-station="${c.Station}" 
             data-channel="${ap.Channel}">
      <span class="slider"></span>
    </label> <span class="deauth-label">DEAUTH</span>
  </li>
`).join("") + `</ul>`;

      }

      html += `<tr>
        <td>${ap.SSID}</td>
        <td>${ap.BSSID}</td>
        <td>${ap.Vendor}</td>
        <td>${ap.Security}</td>
        <td>${ap.Signal} dBm</td>
        <td>${ap.Channel}</td>
        <td>${clientDetails}</td>
      </tr>`;
    }

    html += `</tbody></table>`;
    resultsDiv.innerHTML = html;

    document.querySelectorAll(".deauth-toggle").forEach(toggle => {
  toggle.addEventListener("change", async () => {
    const checked = toggle.checked;
    const bssid = toggle.dataset.bssid;
    const station = toggle.dataset.station;
    const channel = toggle.dataset.channel;
    const iface = document.getElementById("ifaceSelect").value;

    try {
      const res = await fetch("/api/deauth-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bssid, station, channel, iface, active: checked })
      });

      const result = await res.json();
      console.log(result.message);
    } catch (err) {
      alert("Error toggling deauth.");
      toggle.checked = false;
    }
  });
});


    updateWifiChart(data);


  } catch (error) {
    resultsDiv.innerHTML = "<p>Error while scanning Wi-Fi networks.</p>";
  } finally {
    clearInterval(progressInterval);
    progressContainer.style.display = "none";
    button.disabled = false;
    button.textContent = "Start Scan";
  }
}
