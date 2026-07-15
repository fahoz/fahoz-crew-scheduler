import express from "express";
import cors from "cors";
import { config } from "./utils/config";
import { errorHandler } from "./middleware/errorHandler";

import crewRoutes from "./routes/crewRoutes";
import flightRoutes from "./routes/flightRoutes";
import assignmentRoutes from "./routes/assignmentRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";

const app = express();

app.use(cors());
app.use(express.json());

// --- API ROUTE'LARI ---
app.use("/api/crew", crewRoutes);
app.use("/api/flights", flightRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date() }));

// --- MERKEZİ HATA YÖNETİMİ (her zaman en sonda) ---
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`🚀 Crew Schedule API http://localhost:${config.port} adresinde çalışıyor`);
});
