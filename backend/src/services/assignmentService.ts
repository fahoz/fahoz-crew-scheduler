import { prisma } from "../lib/prisma";
import {
  NotFoundError,
  ScheduleConflictError,
  WeeklyHourLimitExceededError,
  DuplicateAssignmentError,
} from "../utils/errors";
import { sendAssignmentMail } from "./mailService";
import { auditService } from "./auditService";
import dayjs from "dayjs";

export const assignmentService = {
  /**
   * Bir personeli bir uçuşa atar. Sırasıyla üç kritik kuralı kontrol eder:
   *   1) Çakışma Kontrolü
   *   2) Maksimum Mesai Sınırı
   *   3) (Rol eşleşmesi burada değil, flightService.markReady() içinde
   *      kontrol edilir çünkü o kural "uçuşun hazır olması" ile ilgilidir,
   *      atama anında değil - bir uçuşa fazladan personel atanabilir.)
   */
  async assignCrewToFlight(flightId: string, crewId: string) {
    const [flight, crew] = await Promise.all([
      prisma.flight.findUnique({ where: { id: flightId } }),
      prisma.crew.findUnique({ where: { id: crewId } }),
    ]);

    if (!flight) throw new NotFoundError("Uçuş bulunamadı.");
    if (!crew) throw new NotFoundError("Personel bulunamadı.");

    // Aynı personel aynı uçuşa iki kez atanamaz
    const existing = await prisma.assignment.findUnique({
      where: { flightId_crewId: { flightId, crewId } },
    });
    if (existing) throw new DuplicateAssignmentError();

    // ---------------------------------------------------------
    // KURAL 1: ÇAKIŞMA KONTROLÜ
    // Personelin, yeni uçuşun [departureTime, arrivalTime] aralığıyla
    // çakışan (iptal edilmemiş) başka bir ataması var mı?
    // Çakışma matematiği: mevcutBaşlangıç < yeniBitiş AND mevcutBitiş > yeniBaşlangıç
    // ---------------------------------------------------------
    const overlapping = await prisma.assignment.findFirst({
      where: {
        crewId,
        flight: {
          status: { not: "CANCELLED" },
          departureTime: { lt: flight.arrivalTime },
          arrivalTime: { gt: flight.departureTime },
        },
      },
      include: { flight: true },
    });

    if (overlapping) {
      throw new ScheduleConflictError(
        `${crew.name}, ${overlapping.flight.flightCode} numaralı uçuşla çakışıyor ` +
          `(${dayjs(overlapping.flight.departureTime).format("DD.MM.YYYY HH:mm")} - ` +
          `${dayjs(overlapping.flight.arrivalTime).format("DD.MM.YYYY HH:mm")}).`
      );
    }

    // ---------------------------------------------------------
    // KURAL 2: MAKSİMUM MESAİ SINIRI (haftalık)
    // Bu uçuşun süresi eklendiğinde haftalık limiti aşıyor mu?
    // ---------------------------------------------------------
    const newFlightHours = dayjs(flight.arrivalTime).diff(flight.departureTime, "minute") / 60;

    const weekStart = dayjs(flight.departureTime).startOf("week").toDate();
    const weekEnd = dayjs(flight.departureTime).endOf("week").toDate();

    const weekAssignments = await prisma.assignment.findMany({
      where: {
        crewId,
        flight: {
          departureTime: { gte: weekStart, lte: weekEnd },
          status: { not: "CANCELLED" },
        },
      },
      include: { flight: true },
    });

    const currentWeeklyHours = weekAssignments.reduce(
      (sum: number, a: (typeof weekAssignments)[number]) => {
        return sum + dayjs(a.flight.arrivalTime).diff(a.flight.departureTime, "minute") / 60;
      },
      0
    );

    const projectedHours = currentWeeklyHours + newFlightHours;

    if (projectedHours > crew.weeklyLimitHours) {
      throw new WeeklyHourLimitExceededError(
        `${crew.name} için haftalık mesai sınırı (${crew.weeklyLimitHours} saat) aşılıyor. ` +
          `Mevcut: ${currentWeeklyHours.toFixed(1)} saat, bu uçuşla birlikte: ${projectedHours.toFixed(
            1
          )} saat.`
      );
    }

    // ---------------------------------------------------------
    // Tüm kurallar geçildi -> atamayı oluştur, toplam saati güncelle,
    // bildirim e-postasını tetikle.
    // ---------------------------------------------------------
    const assignment = await prisma.$transaction(async (tx: any) => {
      const created = await tx.assignment.create({
        data: { flightId, crewId },
        include: { flight: true, crew: true },
      });

      await tx.crew.update({
        where: { id: crewId },
        data: { totalFlightHours: { increment: newFlightHours } },
      });

      return created;
    });

    // E-posta simülasyonu (senkron/asenkron fark etmez, hata fırlatmaz)
    sendAssignmentMail({
      crewName: crew.name,
      crewEmail: crew.email,
      flightCode: flight.flightCode,
      origin: flight.origin,
      destination: flight.destination,
      departureTime: flight.departureTime,
    });

    await auditService.log(
      "ASSIGNMENT_CREATED",
      `${crew.name}, ${flight.flightCode} (${flight.origin} → ${flight.destination}) uçuşuna atandı.`,
      "ASSIGNMENT",
      assignment.id
    );

    return assignment;
  },

  async removeAssignment(assignmentId: string) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { flight: true, crew: true },
    });
    if (!assignment) throw new NotFoundError("Atama bulunamadı.");

    const hours =
      dayjs(assignment.flight.arrivalTime).diff(assignment.flight.departureTime, "minute") / 60;

    const removed = await prisma.$transaction(async (tx: any) => {
      await tx.crew.update({
        where: { id: assignment.crewId },
        data: { totalFlightHours: { decrement: hours } },
      });
      return tx.assignment.delete({ where: { id: assignmentId } });
    });

    await auditService.log(
      "ASSIGNMENT_REMOVED",
      `${assignment.crew.name}, ${assignment.flight.flightCode} uçuşundan çıkarıldı.`,
      "ASSIGNMENT",
      assignmentId
    );

    return removed;
  },

  /**
   * Bir uçuş için müsait (çakışması olmayan, ACTIVE) personel listesini döndürür.
   * Uçuş Planlama & Atama ekranındaki interaktif liste bunu kullanır.
   */
  async getAvailableCrewForFlight(flightId: string) {
    const flight = await prisma.flight.findUnique({ where: { id: flightId } });
    if (!flight) throw new NotFoundError("Uçuş bulunamadı.");

    const allActive = await prisma.crew.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    });

    const conflicting = await prisma.assignment.findMany({
      where: {
        flight: {
          status: { not: "CANCELLED" },
          departureTime: { lt: flight.arrivalTime },
          arrivalTime: { gt: flight.departureTime },
        },
      },
      select: { crewId: true },
    });
    const busyIds = new Set(conflicting.map((c: { crewId: string }) => c.crewId));

    const alreadyAssigned = await prisma.assignment.findMany({
      where: { flightId },
      select: { crewId: true },
    });
    const assignedIds = new Set(alreadyAssigned.map((a: { crewId: string }) => a.crewId));

    return allActive
      .filter((c: (typeof allActive)[number]) => !busyIds.has(c.id) && !assignedIds.has(c.id))
      .map((c: (typeof allActive)[number]) => ({ ...c }));
  },
};
