mountSidebar("crew");

async function loadCrewTable() {
  const tbody = document.getElementById("crew-table-body");
  try {
    const crew = await api.getCrewList();

    if (crew.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Henüz personel kaydı yok.</td></tr>`;
      return;
    }

    // Her personelin bu haftaki toplam mesaisini backend'den ayrı ayrı çekmek
    // yerine assignments listesinden yaklaşık hesaplıyoruz (hızlı görüntü için).
    tbody.innerHTML = crew
      .map((c) => {
        const weeklyHoursApprox = c.assignments
          .filter((a) => isSameWeek(new Date(a.flight.departureTime)))
          .reduce((sum, a) => sum + hoursBetween(a.flight.departureTime, a.flight.arrivalTime), 0);

        return `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td><span class="badge ${roleBadgeClass[c.role]}">${roleLabels[c.role]}</span></td>
          <td class="text-muted">${c.email}</td>
          <td><span class="badge ${crewStatusBadgeClass[c.status]}">${crewStatusLabels[c.status]}</span></td>
          <td>${formatHours(c.totalFlightHours)}</td>
          <td>${formatHours(weeklyHoursApprox)} / ${formatHours(c.weeklyLimitHours)}</td>
          <td>
            <select class="btn btn-sm status-select" data-id="${c.id}">
              <option value="ACTIVE" ${c.status === "ACTIVE" ? "selected" : ""}>Aktif</option>
              <option value="INACTIVE" ${c.status === "INACTIVE" ? "selected" : ""}>Pasif</option>
              <option value="ON_LEAVE" ${c.status === "ON_LEAVE" ? "selected" : ""}>İzinli</option>
            </select>
          </td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-sm btn-ghost edit-crew-btn" data-id="${c.id}">Düzenle</button>
              <button class="btn btn-sm btn-danger delete-crew-btn" data-id="${c.id}" data-name="${c.name}">Sil</button>
            </div>
          </td>
        </tr>
      `;
      })
      .join("");

    document.querySelectorAll(".status-select").forEach((sel) => {
      sel.addEventListener("change", async (e) => {
        const id = e.target.dataset.id;
        try {
          await api.updateCrew(id, { status: e.target.value });
          showToast("Personel durumu güncellendi.");
          loadCrewTable();
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    });

    document.querySelectorAll(".edit-crew-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.dataset.id;
        const c = crew.find((x) => x.id === id);
        openEditCrewModal(c);
      });
    });

    document.querySelectorAll(".delete-crew-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.dataset.id;
        const name = e.target.dataset.name;
        if (!confirm(`${name} adlı personeli silmek istediğinize emin misiniz?`)) return;
        try {
          await api.deleteCrew(id);
          showToast("Personel silindi.");
          loadCrewTable();
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Yüklenemedi: ${err.message}</td></tr>`;
  }
}

function isSameWeek(date) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
}

function hoursBetween(start, end) {
  return (new Date(end) - new Date(start)) / (1000 * 60 * 60);
}

// --- Yeni Personel Modal ---
const modal = document.getElementById("add-crew-modal");
document.getElementById("btn-open-add-crew").addEventListener("click", () => {
  modal.style.display = "flex";
});
document.getElementById("btn-cancel-add-crew").addEventListener("click", () => {
  modal.style.display = "none";
});

document.getElementById("add-crew-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const payload = {
    name: form.get("name"),
    email: form.get("email"),
    role: form.get("role"),
    weeklyLimitHours: Number(form.get("weeklyLimitHours")),
  };

  try {
    await api.createCrew(payload);
    showToast("Personel başarıyla eklendi.");
    modal.style.display = "none";
    e.target.reset();
    loadCrewTable();
  } catch (err) {
    showToast(err.message, "error");
  }
});

loadCrewTable();

// --- Personel Düzenleme Modal ---
const editModal = document.getElementById("edit-crew-modal");

function openEditCrewModal(crewMember) {
  const form = document.getElementById("edit-crew-form");
  form.id.value = crewMember.id;
  form.name.value = crewMember.name;
  form.email.value = crewMember.email;
  form.role.value = crewMember.role;
  form.weeklyLimitHours.value = crewMember.weeklyLimitHours;
  editModal.style.display = "flex";
}

document.getElementById("btn-cancel-edit-crew").addEventListener("click", () => {
  editModal.style.display = "none";
});

document.getElementById("edit-crew-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const id = form.get("id");
  const payload = {
    name: form.get("name"),
    email: form.get("email"),
    role: form.get("role"),
    weeklyLimitHours: Number(form.get("weeklyLimitHours")),
  };

  try {
    await api.updateCrew(id, payload);
    showToast("Personel bilgileri güncellendi.");
    editModal.style.display = "none";
    loadCrewTable();
  } catch (err) {
    showToast(err.message, "error");
  }
});
