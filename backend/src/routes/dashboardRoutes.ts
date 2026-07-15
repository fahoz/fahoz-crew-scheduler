import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { flightService } from "../services/flightService";
import { auditService } from "../services/auditService";
import dayjs from "dayjs";

const router = Router();

// GET /api/dashboard/summary
router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const start = dayjs().startOf("day").toDate();
    const end = dayjs().endOf("day").toDate();

    const [activeFlights, availablePilots, todayFlights, totalCrew, recentActivity] =
      await Promise.all([
        prisma.flight.count({ where: { status: { in: ["PLANNED", "READY"] } } }),
        prisma.crew.count({ where: { role: "PILOT", status: "ACTIVE" } }),
        flightService.todayFlights(),
        prisma.crew.count(),
        auditService.recent(15),
      ]);

    res.json({
      activeFlightCount: activeFlights,
      availablePilotCount: availablePilots,
      totalCrewCount: totalCrew,
      todayFlights,
      recentActivity,
    });
  })
);

export default router;
