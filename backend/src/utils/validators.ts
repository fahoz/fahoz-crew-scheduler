import { z } from "zod";

export const createCrewSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalı."),
  email: z.string().email("Geçerli bir e-posta girin."),
  role: z.enum(["PILOT", "CO_PILOT", "CABIN_CHIEF", "FLIGHT_ATTENDANT"]),
  weeklyLimitHours: z.number().positive().optional(),
});

export const updateCrewSchema = createCrewSchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).optional(),
});

export const createFlightSchema = z
  .object({
    flightCode: z.string().min(3, "Uçuş kodu en az 3 karakter olmalı."),
    origin: z.string().min(2),
    destination: z.string().min(2),
    departureTime: z.string(),
    arrivalTime: z.string(),
  })
  .refine((d) => new Date(d.arrivalTime) > new Date(d.departureTime), {
    message: "Varış zamanı, kalkış zamanından sonra olmalı.",
    path: ["arrivalTime"],
  });

export const updateFlightSchema = z.object({
  flightCode: z.string().min(3).optional(),
  origin: z.string().min(2).optional(),
  destination: z.string().min(2).optional(),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  status: z
    .enum([
      "PLANNED",
      "READY",
      "TAXI",
      "CLEARED_TAKEOFF",
      "AIRBORNE",
      "CLEARED_LANDING",
      "COMPLETED",
      "CANCELLED",
    ])
    .optional(),
});

export const createAssignmentSchema = z.object({
  flightId: z.string().min(1),
  crewId: z.string().min(1),
});
