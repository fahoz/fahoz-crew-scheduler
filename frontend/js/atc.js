mountSidebar("atc");

async function loadAtcFlights() {
  const container = document.getElementById("atc-flights-container");
  try {
    const flights = await api.getFlights();
    const relevant = flights.filter((f) => f.status !== "CANCELLED");

    if (relevant.length === 0) {
      container.innerHTML = `<div class="empty-state">Gösterilecek uçuş bulunmuyor.</div>`;
      return;
    }

    container.innerHTML = relevant.map((f) => renderAtcCard(f)).join("");

    // Her kart için hava durumunu ayrı ayrı çek (basit simülasyon)
    relevant.forEach((f) => loadWeatherForCard(f.id));

    attachAtcEventListeners();
  } catch (err) {
    container.innerHTML = `<div class="empty-state">Yüklenemedi: ${err.message}</div>`;
  }
}

function renderAtcCard(flight) {
  const currentIndex = ATC_FLOW.indexOf(flight.status);
  const isCancelled = flight.status === "CANCELLED";

  const stepsHtml = ATC_FLOW.map((step, i) => {
    let cls = "atc-step";
    if (isCancelled) cls += " cancelled";
    else if (i < currentIndex) cls += " done";
    else if (i === currentIndex) cls += " current";
    return `<span class="${cls}">${flightStatusLabels[step]}</span>`;
  }).join(`<span class="atc-arrow">→</span>`);

  // Uçağın rota üzerindeki konumu (görsel simülasyon, gerçek koordinat değil)
  let planePercent = 0;
  if (flight.status === "TAXI" || flight.status === "CLEARED_TAKEOFF") planePercent = 10;
  else if (flight.status === "AIRBORNE") planePercent = 50;
  else if (flight.status === "CLEARED_LANDING") planePercent = 90;
  else if (flight.status === "COMPLETED") planePercent = 100;

  const canAdvance =
    flight.status !== "PLANNED" &&
    flight.status !== "COMPLETED" &&
    flight.status !== "CANCELLED";
  const nextLabel =
    currentIndex >= 0 && currentIndex < ATC_FLOW.length - 1
      ? `${flightStatusLabels[ATC_FLOW[currentIndex + 1]]} Yap`
      : null;

  return `
    <div class="atc-card" data-flight-id="${flight.id}">
      <div class="flight-card-header" style="border:none; margin-bottom:0; padding-bottom:0;">
        <div>
          <div class="flight-card-code">${flight.flightCode}</div>
          <div class="flight-card-route">${flight.origin} → ${flight.destination} · ${formatDateTime(flight.departureTime)}</div>
        </div>
        <span class="badge ${flightStatusBadgeClass[flight.status]}">${flightStatusLabels[flight.status]}</span>
      </div>

      <div class="atc-flow">${stepsHtml}</div>

      <div class="route-line-wrap">
        <span class="route-point">${flight.origin}</span>
        <div class="route-track">
          <span class="route-plane" style="left:${planePercent}%;">✈️</span>
        </div>
        <span class="route-point">${flight.destination}</span>
      </div>

      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <span class="weather-badge" id="weather-${flight.id}">Hava durumu yükleniyor...</span>

        <div style="display:flex; gap:8px;">
          ${
            flight.status === "PLANNED"
              ? `<span class="text-muted" style="font-size:12px;">Önce Uçuş Planlama ekranından "Hazır" durumuna alın.</span>`
              : ""
          }
          ${
            canAdvance && nextLabel
              ? `<button class="btn btn-sm btn-primary atc-advance-btn" data-id="${flight.id}">${nextLabel}</button>`
              : ""
          }
          ${
            flight.status !== "COMPLETED" && flight.status !== "CANCELLED"
              ? `<button class="btn btn-sm btn-danger atc-cancel-btn" data-id="${flight.id}">Uçuşu İptal Et</button>`
              : ""
          }
        </div>
      </div>
    </div>
  `;
}

async function loadWeatherForCard(flightId) {
  const el = document.getElementById(`weather-${flightId}`);
  if (!el) return;
  try {
    const w = await api.getFlightWeather(flightId);
    const icon = w.condition === "UYGUN" ? "🟢" : w.condition === "DIKKATLI" ? "🟡" : "🔴";
    el.textContent = `${icon} Rüzgar: ${w.windDirection} ${w.windSpeed} kt — ${w.conditionLabel}`;
  } catch (err) {
    el.textContent = "Hava durumu alınamadı";
  }
}

function attachAtcEventListeners() {
  document.querySelectorAll(".atc-advance-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      btn.disabled = true;
      try {
        await api.advanceFlightStatus(id);
        showToast("Uçuş durumu güncellendi.");
        loadAtcFlights();
      } catch (err) {
        showToast(err.message, "error");
        btn.disabled = false;
      }
    });
  });

  document.querySelectorAll(".atc-cancel-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      if (!confirm("Bu uçuşu iptal etmek istediğinize emin misiniz?")) return;
      try {
        await api.cancelFlight(id);
        showToast("Uçuş iptal edildi.");
        loadAtcFlights();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });
}

loadAtcFlights();
setInterval(loadAtcFlights, 20000);
