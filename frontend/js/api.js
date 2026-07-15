// ==========================================================
// API İstemcisi — backend ile tüm HTTP iletişimi burada.
// ==========================================================

const API_BASE = "http://localhost:4000/api";

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.error?.message || "Bilinmeyen bir hata oluştu.";
    const err = new Error(message);
    err.code = data?.error?.code;
    err.details = data?.error?.details;
    throw err;
  }

  return data;
}

const api = {
  // --- Dashboard ---
  getDashboardSummary: () => apiRequest("/dashboard/summary"),

  // --- Crew ---
  getCrewList: () => apiRequest("/crew"),
  getCrewById: (id) => apiRequest(`/crew/${id}`),
  getAvailableCrew: (role) => apiRequest(`/crew/available${role ? `?role=${role}` : ""}`),
  createCrew: (payload) => apiRequest("/crew", { method: "POST", body: JSON.stringify(payload) }),
  updateCrew: (id, payload) =>
    apiRequest(`/crew/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteCrew: (id) => apiRequest(`/crew/${id}`, { method: "DELETE" }),

  // --- Flights ---
  getFlights: (filter = {}) => {
    const params = new URLSearchParams();
    if (filter.status) params.set("status", filter.status);
    if (filter.search) params.set("search", filter.search);
    if (filter.from) params.set("from", filter.from);
    if (filter.to) params.set("to", filter.to);
    const qs = params.toString();
    return apiRequest(`/flights${qs ? `?${qs}` : ""}`);
  },
  getFlightById: (id) => apiRequest(`/flights/${id}`),
  getTodayFlights: () => apiRequest("/flights/today"),
  getAvailableCrewForFlight: (flightId) => apiRequest(`/flights/${flightId}/available-crew`),
  getFlightReadiness: (flightId) => apiRequest(`/flights/${flightId}/readiness`),
  createFlight: (payload) => apiRequest("/flights", { method: "POST", body: JSON.stringify(payload) }),
  updateFlight: (id, payload) =>
    apiRequest(`/flights/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  markFlightReady: (id) => apiRequest(`/flights/${id}/mark-ready`, { method: "POST" }),
  advanceFlightStatus: (id) => apiRequest(`/flights/${id}/advance-status`, { method: "POST" }),
  cancelFlight: (id) => apiRequest(`/flights/${id}/cancel`, { method: "POST" }),
  getFlightWeather: (id) => apiRequest(`/flights/${id}/weather`),
  deleteFlight: (id) => apiRequest(`/flights/${id}`, { method: "DELETE" }),

  // --- Assignments ---
  createAssignment: (flightId, crewId) =>
    apiRequest("/assignments", { method: "POST", body: JSON.stringify({ flightId, crewId }) }),
  deleteAssignment: (id) => apiRequest(`/assignments/${id}`, { method: "DELETE" }),
};

// ---------------- Toast bildirimleri ----------------
function showToast(message, type = "success") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 4200);
}

// ---------------- Ortak formatlayıcılar ----------------
function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatHours(n) {
  return `${Number(n).toFixed(1)} sa`;
}

const roleLabels = {
  PILOT: "Pilot",
  CO_PILOT: "Co-Pilot",
  CABIN_CHIEF: "Kabin Amiri",
  FLIGHT_ATTENDANT: "Hostes / Kabin Memuru",
};

const roleBadgeClass = {
  PILOT: "badge-navy",
  CO_PILOT: "badge-teal",
  CABIN_CHIEF: "badge-gold",
  FLIGHT_ATTENDANT: "badge-muted",
};

const flightStatusLabels = {
  PLANNED: "Planlandı",
  READY: "Hazır",
  TAXI: "Taksi",
  CLEARED_TAKEOFF: "Kalkışa İzin Verildi",
  AIRBORNE: "Havada",
  CLEARED_LANDING: "İnişe İzin Verildi",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};

const flightStatusBadgeClass = {
  PLANNED: "badge-gold",
  READY: "badge-success",
  TAXI: "badge-teal",
  CLEARED_TAKEOFF: "badge-navy",
  AIRBORNE: "badge-navy",
  CLEARED_LANDING: "badge-teal",
  COMPLETED: "badge-navy",
  CANCELLED: "badge-danger",
};

// ATC akışının sırası (advance-status butonunun ilerleteceği sıra)
const ATC_FLOW = ["PLANNED", "READY", "TAXI", "CLEARED_TAKEOFF", "AIRBORNE", "CLEARED_LANDING", "COMPLETED"];

const crewStatusLabels = {
  ACTIVE: "Aktif",
  INACTIVE: "Pasif",
  ON_LEAVE: "İzinli",
};

const crewStatusBadgeClass = {
  ACTIVE: "badge-success",
  INACTIVE: "badge-muted",
  ON_LEAVE: "badge-gold",
};
