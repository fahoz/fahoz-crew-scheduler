import { Router } from "express";
import { flightService } from "../services/flightService";
import { assignmentService } from "../services/assignmentService";
import { asyncHandler } from "../middleware/errorHandler";
import { createFlightSchema, updateFlightSchema } from "../utils/validators";

const router = Router();

// GET /api/flights?status=READY&search=TK19&from=...&to=...
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, search, from, to } = req.query as Record<string, string | undefined>;
    const flights = await flightService.list({ status: status as any, search, from, to });
    res.json(flights);
  })
);

// GET /api/flights/today
router.get(
  "/today",
  asyncHandler(async (req, res) => {
    const flights = await flightService.todayFlights();
    res.json(flights);
  })
);

// GET /api/flights/:id
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const flight = await flightService.getById(req.params.id);
    res.json(flight);
  })
);

// GET /api/flights/:id/available-crew  -> müsait personel listesi (atama ekranı için)
router.get(
  "/:id/available-crew",
  asyncHandler(async (req, res) => {
    const crew = await assignmentService.getAvailableCrewForFlight(req.params.id);
    res.json(crew);
  })
);

// GET /api/flights/:id/readiness -> rol dağılımı özeti
router.get(
  "/:id/readiness",
  asyncHandler(async (req, res) => {
    const summary = await flightService.getReadinessSummary(req.params.id);
    res.json(summary);
  })
);

// POST /api/flights
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createFlightSchema.parse(req.body);
    const flight = await flightService.create(data);
    res.status(201).json(flight);
  })
);

// PATCH /api/flights/:id
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = updateFlightSchema.parse(req.body);
    const flight = await flightService.update(req.params.id, data);
    res.json(flight);
  })
);

// POST /api/flights/:id/mark-ready  -> KURAL 3 burada kontrol edilir
router.post(
  "/:id/mark-ready",
  asyncHandler(async (req, res) => {
    const flight = await flightService.markReady(req.params.id);
    res.json(flight);
  })
);

// POST /api/flights/:id/advance-status -> ATC: bir sonraki aşamaya geçir
router.post(
  "/:id/advance-status",
  asyncHandler(async (req, res) => {
    const flight = await flightService.advanceAtcStatus(req.params.id);
    res.json(flight);
  })
);

// POST /api/flights/:id/cancel -> uçuşu iptal et
router.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const flight = await flightService.cancel(req.params.id);
    res.json(flight);
  })
);

// GET /api/flights/:id/weather -> basit hava durumu simülasyonu
router.get(
  "/:id/weather",
  asyncHandler(async (req, res) => {
    await flightService.getById(req.params.id); // uçuş var mı kontrolü
    const weather = flightService.simulateWeather(req.params.id);
    res.json(weather);
  })
);

// DELETE /api/flights/:id
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await flightService.remove(req.params.id);
    res.status(204).send();
  })
);

export default router;
