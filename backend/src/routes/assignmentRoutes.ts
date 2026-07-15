import { Router } from "express";
import { assignmentService } from "../services/assignmentService";
import { asyncHandler } from "../middleware/errorHandler";
import { createAssignmentSchema } from "../utils/validators";

const router = Router();

// POST /api/assignments -> Uçuşa Ata (KURAL 1 ve KURAL 2 burada kontrol edilir)
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createAssignmentSchema.parse(req.body);
    const assignment = await assignmentService.assignCrewToFlight(data.flightId, data.crewId);
    res.status(201).json(assignment);
  })
);

// DELETE /api/assignments/:id -> atamayı kaldır
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await assignmentService.removeAssignment(req.params.id);
    res.status(204).send();
  })
);

export default router;
