mountSidebar("dashboard");

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function timeAgoTr(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

async function loadDashboard() {
  try {
    const summary = await api.getDashboardSummary();

    document.getElementById("stat-active-flights").textContent = summary.activeFlightCount;
    document.getElementById("stat-available-pilots").textContent = summary.availablePilotCount;
    document.getElementById("stat-total-crew").textContent = summary.totalCrewCount;
    document.getElementById("stat-today-flights").textContent = summary.todayFlights.length;

    renderTodayFlights(summary.todayFlights);
    renderRecentActivity(summary.recentActivity);
  } catch (err) {
    showToast(`Dashboard yüklenemedi: ${err.message}`, "error");
  }
}

function renderTodayFlights(flights) {
  const container = document.getElementById("today-flights-container");

  if (flights.length === 0) {
    container.innerHTML = `<div class="empty-state">Bugün için planlanmış uçuş bulunmuyor.</div>`;
    return;
  }

  container.innerHTML = flights
    .map((f) => {
      const crewHtml = f.assignments.length
        ? f.assignments
            .map(
              (a) => `
          <div class="crew-chip">
            <div class="crew-chip-avatar">${initials(a.crew.name)}</div>
            <div class="crew-chip-info">
              <div class="name">${a.crew.name}</div>
              <div class="role">${roleLabels[a.crew.role]}</div>
            </div>
          </div>
        `
            )
            .join("")
        : `<div class="empty-state" style="padding:10px 0;">Henüz personel atanmadı.</div>`;

      return `
        <div class="flight-card">
          <div class="flight-card-header">
            <div>
              <div class="flight-card-code">${f.flightCode}</div>
              <div class="flight-card-route">${f.origin} → ${f.destination} · ${formatDateTime(f.departureTime)}</div>
            </div>
            <span class="badge ${flightStatusBadgeClass[f.status]}">${flightStatusLabels[f.status]}</span>
          </div>
          <div class="crew-chip-grid">${crewHtml}</div>
        </div>
      `;
    })
    .join("");
}

function renderRecentActivity(logs) {
  const wrap = document.getElementById("recent-activity-wrap");

  if (!logs || logs.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Henüz kayıtlı işlem yok.</div>`;
    return;
  }

  wrap.innerHTML = logs
    .map(
      (log) => `
      <div class="activity-row">
        <span>${log.message}</span>
        <span class="activity-time">${timeAgoTr(log.createdAt)}</span>
      </div>
    `
    )
    .join("");
}

loadDashboard();

// Panel açıkken bilgiler güncel kalsın diye 15 saniyede bir otomatik yenile
setInterval(loadDashboard, 15000);
