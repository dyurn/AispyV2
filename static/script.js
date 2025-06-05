let wifiChart = null;

function updateWifiChart(data) {
  const ctx = document.getElementById("wifiChart").getContext("2d");

  // Détruire l'ancien graphique s'il existe
  if (wifiChart) {
    wifiChart.destroy();
  }

  const datasets = data.map((ap, i) => {
    const channel = ap.Channel;
    const signal = ap.Signal;

    // Génère une "courbe" en cloche centrée sur le canal
    const points = [];
    for (let ch = 1; ch <= 13; ch++) {
      const distance = Math.abs(ch - channel);
      const strength = signal - distance * 10; // forme de cloche simple
      points.push({ x: ch, y: strength });
    }

    return {
      label: ap.SSID || "<Hidden>",
      data: points,
      fill: true,
      tension: 0.4,
      borderColor: `hsl(${(i * 60) % 360}, 100%, 50%)`,
      backgroundColor: `hsla(${(i * 60) % 360}, 100%, 50%, 0.2)`,
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
          text: 'Wi-Fi Signal Strength by Channel',
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
              family: 'Courier New'
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
            color: '#00ff00'
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
          }
        }
      }
    }
  });
}


async function loadInterfaces() {
  const select = document.getElementById("ifaceSelect");
  try {
    const res = await fetch("/api/interfaces");
    const interfaces = await res.json();
    if (interfaces.length === 0) {
      select.innerHTML = `<option disabled>No Wi-Fi interfaces found</option>`;
    } else {
      select.innerHTML = interfaces.map(iface => `<option value="${iface}">${iface}</option>`).join("");
    }
  } catch (err) {
    select.innerHTML = `<option disabled>Error loading interfaces</option>`;
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
  const maxDuration = 15000; // 15 seconds max in case of long scan
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
          <th>Signal</th>
          <th>Channel</th>
          <th>Associated Clients</th>
        </tr>
      </thead>
      <tbody>`;

    for (const ap of data) {
      let clientDetails = "None";
      if (ap.Clients.length > 0) {
        clientDetails = `<ul>` + ap.Clients.map(c => `<li>${c.Station} <span class="client-signal">(${c.Signal} dBm)</span></li>`).join("") + `</ul>`;
      }

      html += `<tr>
        <td>${ap.SSID}</td>
        <td>${ap.BSSID}</td>
        <td>${ap.Vendor}</td>
        <td>${ap.Signal} dBm</td>
        <td>${ap.Channel}</td>
        <td>${clientDetails}</td>
      </tr>`;
    }

    html += `</tbody></table>`;
    resultsDiv.innerHTML = html;

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
