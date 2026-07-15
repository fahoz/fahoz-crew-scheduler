# Fahoz Crew Scheduler

🌐 English | **[Türkçe](README.tr.md)**

A full-stack airport crew & flight scheduling system with conflict detection, weekly-hour limits, role validation, and an ATC status tracker. Built with Node.js/TypeScript/Express/Prisma on the backend and vanilla HTML/CSS/JS on the frontend.

---

<a name="english"></a>
## English

### Features

- **Crew Management** — add, edit, delete crew members; track role, status (Active/Inactive/On Leave), total & weekly flight hours
- **Flight Planning & Assignment** — create/edit flights, filter by status or search by flight code/route, assign crew with one click
- **3 Critical Business Rules** (enforced on the backend):
  1. **Conflict Detection** — a crew member can't be assigned to two overlapping flights
  2. **Weekly Hour Limit** — assignment is blocked if it would exceed the crew member's weekly limit (default 40h)
  3. **Role Requirement** — a flight can only be marked "Ready" once it has ≥1 Pilot, ≥1 Co-Pilot, and ≥2 Cabin Crew assigned
- **ATC Control Tower** — extended flight status flow (Planned → Ready → Taxi → Cleared for Takeoff → Airborne → Cleared for Landing → Completed), simple simulated wind/weather conditions
- **Audit Log** — every important action (crew/flight/assignment created, updated, removed) is recorded and shown on the Dashboard
- **Password-protected panel** — simple single-user login gate
- **Dashboard** — live stats, today's flights with assigned-crew profile cards, recent activity feed

### Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, TypeScript, Express, Prisma ORM |
| Database | PostgreSQL (Supabase) / SQLite (local dev) |
| Frontend | Vanilla HTML, CSS, JavaScript (no framework) |
| Deployment | Vercel (backend, serverless), Netlify (frontend), Supabase (database) |

### Project Structure

```
├── backend/
│   ├── api/index.ts          # Vercel serverless entry point
│   ├── prisma/schema.prisma  # Crew, Flight, Assignment, AuditLog models
│   └── src/
│       ├── app.ts            # Express app (routes wired here)
│       ├── index.ts          # Local dev entry (app.listen)
│       ├── services/         # Business logic — critical rules live here
│       └── routes/           # API endpoints
└── frontend/
    ├── login.html
    ├── index.html             # Dashboard
    └── pages/{crew,flights,atc}.html
```

### Login Credentials

- **Username:** admin
- **Password:** fahozadmin123

(Hardcoded in `frontend/js/auth.js`, change as needed.)

### Running Locally

```bash
cd backend
npm install
cp .env.example .env      # set DATABASE_URL (SQLite or PostgreSQL)
npx prisma migrate dev --name init
npm run seed
npm run dev                # http://localhost:4000
```

```bash
cd frontend
npx serve .                # http://localhost:3000
```

Make sure `API_BASE` in `frontend/js/api.js` points to your backend URL.

### Notes

- No real email is sent — assignment notifications are simulated in the backend console.
- Weather in the ATC view is a deterministic simulation, not a real API.
- This is a personal/learning project, not intended for production airline operations.

---

Made by Fahoz
