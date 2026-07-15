import { Router } from "express";
import { crewService } from "../services/crewService";
import { asyncHandler } from "../middleware/errorHandler";
import { createCrewSchema, updateCrewSchema } from "../utils/validators";

const router = Router();

// GET /api/crew - tüm personel listesi
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const crew = await crewService.list();
    res.json(crew);
  })
);

// GET /api/crew/available?role=PILOT - müsait personel
router.get(
  "/available",
  asyncHandler(async (req, res) => {
    const role = req.query.role as any;
    const crew = await crewService.listAvailable(role);
    res.json(crew);
  })
);

// GET /api/crew/:id
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const crew = await crewService.getById(req.params.id);
    const weeklyHours = await crewService.getWeeklyHours(req.params.id, new Date());
    res.json({ ...crew, currentWeeklyHours: weeklyHours });
  })
);

// POST /api/crew - yeni personel ekle
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createCrewSchema.parse(req.body);
    const crew = await crewService.create(data);
    res.status(201).json(crew);
  })
);

// PATCH /api/crew/:id
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = updateCrewSchema.parse(req.body);
    const crew = await crewService.update(req.params.id, data);
    res.json(crew);
  })
);

// DELETE /api/crew/:id
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await crewService.remove(req.params.id);
    res.status(204).send();
  })
);

export default router;
