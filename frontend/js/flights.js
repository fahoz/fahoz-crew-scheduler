mountSidebar("flights");

let selectedFlightId = null;
let currentFilter = { status: "", search: "" };

async function loadFlightsTable() {
  const tbody = document.getElementById("flights-table-body");
  try {
    const flights = await api.getFlights(currentFilter);

    if (flights.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Filtreye uyan uçuş bulunamadı.</td></tr>`;
      return;
    }

    tbody.innerHTML = flights
      .map(
        (f) => `
        <tr class="flight-row ${f.id === selectedFlightId ? "active-row" : ""}" data-id="${f.id}" style="cursor:pointer;">
          <td><strong>${f.flightCode}</strong></td>
          <td>${f.origin} → ${f.destination}</td>
          <td class="text-muted">${formatDateTime(f.departureTime)}</td>
          <td><span class="badge ${flightStatusBadgeClass[f.status]}">${flightStatusLabels[f.status]}</span></td>
          <td><button class="btn btn-sm btn-ghost select-flight-btn" data-id="${f.id}">Seç</button></td>
          <td><button class="btn btn-sm btn-ghost edit-flight-btn" data-id="${f.id}">Düzenle</button></td>
        </tr>
      `
      )
      .join("");

    document.querySelectorAll(".select-flight-btn, .flight-row").forEach((el) => {
      el.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        selectedFlightId = id;
        renderAssignmentPanel(id);
        loadFlightsTable();
      });
    });

    document.querySelectorAll(".edit-flight-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = e.target.dataset.id;
        const flight = flights.find((f) => f.id === id);
        openEditFlightModal(flight);
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Yüklenemedi: ${err.message}</td></tr>`;
  }
}

async function renderAssignmentPanel(flightId) {
  const panel = document.getElementById("assignment-panel");
  panel.innerHTML = `<div class="empty-state">Yükleniyor...</div>`;

  try {
    const [flight, availableCrew, readiness] = await Promise.all([
      api.getFlightById(flightId),
      api.getAvailableCrewForFlight(flightId),
      api.getFlightReadiness(flightId),
    ]);

    const assignedHtml = flight.assignments.length
      ? flight.assignments
          .map(
            (a) => `
        <div class="crew-pick-row">
          <div class="crew-pick-info">
            <div class="name">${a.crew.name}</div>
            <div class="meta"><span class="badge ${roleBadgeClass[a.crew.role]}">${roleLabels[a.crew.role]}</span></div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-sm btn-danger remove-assignment-btn" data-assignment-id="${a.id}">Kaldır</button>
          </div>
        </div>
      `
          )
          .join("")
      : `<div class="empty-state">Henüz atanmış personel yok.</div>`;

    const availableHtml = availableCrew.length
      ? availableCrew
          .map(
            (c) => `
        <div class="crew-pick-row">
          <div class="crew-pick-info">
            <div class="name">${c.name}</div>
            <div class="meta"><span class="badge ${roleBadgeClass[c.role]}">${roleLabels[c.role]}</span> · Toplam: ${formatHours(c.totalFlightHours)}</div>
          </div>
          <button class="btn btn-sm btn-primary assign-btn" data-crew-id="${c.id}">Uçuşa Ata</button>
        </div>
      `
          )
          .join("")
      : `<div class="empty-state">Bu uçuş için müsait (çakışması olmayan) personel bulunamadı.</div>`;

    const readyReqText = `Gerekli: ${readiness.required.PILOT} Pilot, ${readiness.required.CO_PILOT} Co-Pilot, ${readiness.required.CABIN_CREW} Kabin Ekibi`;
    const readyCurrentText = `Mevcut: ${readiness.counts.PILOT} Pilot, ${readiness.counts.CO_PILOT} Co-Pilot, ${readiness.counts.CABIN_CREW} Kabin Ekibi`;

    panel.innerHTML = `
      <div class="mb-16">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <div style="font-size:16px; font-weight:700;">${flight.flightCode}</div>
            <div class="text-muted" style="font-size:12.5px; margin-top:2px;">
              ${flight.origin} → ${flight.destination} · ${formatDateTime(flight.departureTime)}
            </div>
          </div>
          <span class="badge ${flightStatusBadgeClass[flight.status]}">${flightStatusLabels[flight.status]}</span>
        </div>
      </div>

      <div class="card mb-16" style="background: var(--bg-panel-alt);">
        <div class="card-title">Rol Eşleşme Durumu (Kural 3)</div>
        <div style="font-size:12.5px; color: var(--text-secondary);">${readyReqText}</div>
        <div style="font-size:12.5px; margin-top:4px;">${readyCurrentText}</div>
        <div class="mt-16">
          <button class="btn btn-sm ${readiness.isReady ? "btn-primary" : "btn-ghost"}" id="btn-mark-ready" ${readiness.isReady ? "" : "disabled"}>
            ${flight.status === "READY" ? "✓ Uçuş Hazır" : "Uçuşu Hazır Olarak İşaretle"}
          </button>
          ${!readiness.isReady ? `<span class="text-muted" style="font-size:11.5px; margin-left:8px;">Eksik roller tamamlanmadan işaretlenemez.</span>` : ""}
        </div>
      </div>

      <div class="card-title">Atanmış Personel</div>
      <div class="table-wrap mb-16">${assignedHtml}</div>

      <div class="card-title">Müsait Personel (Çakışması Olmayan)</div>
      <div class="table-wrap">${availableHtml}</div>
    `;

    document.querySelectorAll(".assign-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const crewId = e.target.dataset.crewId;
        btn.disabled = true;
        btn.textContent = "Atanıyor...";
        try {
          await api.createAssignment(flightId, crewId);
          showToast("Personel uçuşa başarıyla atandı. Bilgilendirme e-postası gönderildi.");
          renderAssignmentPanel(flightId);
          loadFlightsTable();
        } catch (err) {
          // KURAL 1, 2 ihlalleri burada kullanıcıya net şekilde gösterilir
          showToast(err.message, "error");
          btn.disabled = false;
          btn.textContent = "Uçuşa Ata";
        }
      });
    });

    document.querySelectorAll(".remove-assignment-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const assignmentId = e.target.dataset.assignmentId;
        try {
          await api.deleteAssignment(assignmentId);
          showToast("Atama kaldırıldı.");
          renderAssignmentPanel(flightId);
          loadFlightsTable();
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    });

    const readyBtn = document.getElementById("btn-mark-ready");
    if (readyBtn && !readyBtn.disabled) {
      readyBtn.addEventListener("click", async () => {
        try {
          await api.markFlightReady(flightId);
          showToast("Uçuş 'Hazır' durumuna alındı.");
          renderAssignmentPanel(flightId);
          loadFlightsTable();
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    }
  } catch (err) {
    panel.innerHTML = `<div class="empty-state">Yüklenemedi: ${err.message}</div>`;
  }
}

// --- Yeni Uçuş Modal ---
const flightModal = document.getElementById("add-flight-modal");
document.getElementById("btn-open-add-flight").addEventListener("click", () => {
  flightModal.style.display = "flex";
});
document.getElementById("btn-cancel-add-flight").addEventListener("click", () => {
  flightModal.style.display = "none";
});

document.getElementById("add-flight-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const payload = {
    flightCode: form.get("flightCode"),
    origin: form.get("origin"),
    destination: form.get("destination"),
    departureTime: new Date(form.get("departureTime")).toISOString(),
    arrivalTime: new Date(form.get("arrivalTime")).toISOString(),
  };

  try {
    await api.createFlight(payload);
    showToast("Uçuş başarıyla eklendi.");
    flightModal.style.display = "none";
    e.target.reset();
    loadFlightsTable();
  } catch (err) {
    showToast(err.message, "error");
  }
});

loadFlightsTable();

// --- Filtreleme ---
let searchDebounce;
document.getElementById("filter-search").addEventListener("input", (e) => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    currentFilter.search = e.target.value.trim();
    loadFlightsTable();
  }, 300);
});

document.getElementById("filter-status").addEventListener("change", (e) => {
  currentFilter.status = e.target.value;
  loadFlightsTable();
});

document.getElementById("btn-clear-filters").addEventListener("click", () => {
  currentFilter = { status: "", search: "" };
  document.getElementById("filter-search").value = "";
  document.getElementById("filter-status").value = "";
  loadFlightsTable();
});

// --- Uçuş Düzenleme Modal ---
const editFlightModal = document.getElementById("edit-flight-modal");

function toDatetimeLocalValue(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function openEditFlightModal(flight) {
  const form = document.getElementById("edit-flight-form");
  form.id.value = flight.id;
  form.flightCode.value = flight.flightCode;
  form.origin.value = flight.origin;
  form.destination.value = flight.destination;
  form.departureTime.value = toDatetimeLocalValue(flight.departureTime);
  form.arrivalTime.value = toDatetimeLocalValue(flight.arrivalTime);
  editFlightModal.style.display = "flex";
}

document.getElementById("btn-cancel-edit-flight").addEventListener("click", () => {
  editFlightModal.style.display = "none";
});

document.getElementById("edit-flight-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const id = form.get("id");
  const payload = {
    flightCode: form.get("flightCode"),
    origin: form.get("origin"),
    destination: form.get("destination"),
    departureTime: new Date(form.get("departureTime")).toISOString(),
    arrivalTime: new Date(form.get("arrivalTime")).toISOString(),
  };

  try {
    await api.updateFlight(id, payload);
    showToast("Uçuş bilgileri güncellendi.");
    editFlightModal.style.display = "none";
    loadFlightsTable();
    if (selectedFlightId === id) renderAssignmentPanel(id);
  } catch (err) {
    showToast(err.message, "error");
  }
});
