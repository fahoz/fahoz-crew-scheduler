import { prisma } from "../lib/prisma";

// Not: Bu tipler prisma/schema.prisma içindeki enum'larla birebir eşleşir.
// `npx prisma generate` çalıştırıldıktan sonra bunun yerine
// `import { CrewRole, CrewStatus } from "@prisma/client"` kullanılabilir.
export type CrewRole = "PILOT" | "CO_PILOT" | "CABIN_CHIEF" | "FLIGHT_ATTENDANT";
export type CrewStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE";
import { NotFoundError } from "../utils/errors";
import { auditService } from "./auditService";
import dayjs from "dayjs";

interface CreateCrewInput {
  name: string;
  email: string;
  role: CrewRole;
  weeklyLimitHours?: number;
}

export const crewService = {
  async list() {
    return prisma.crew.findMany({
      orderBy: { name: "asc" },
      include: {
        assignments: {
          include: { flight: true },
        },
      },
    });
  },

  async getById(id: string) {
    const crew = await prisma.crew.findUnique({
      where: { id },
      include: { assignments: { include: { flight: true } } },
    });
    if (!crew) throw new NotFoundError("Personel bulunamadı.");
    return crew;
  },

  async create(input: CreateCrewInput) {
    const crew = await prisma.crew.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        weeklyLimitHours: input.weeklyLimitHours ?? 40,
      },
    });
    await auditService.log(
      "CREW_CREATED",
      `${crew.name} (${roleTr(crew.role)}) ekip listesine eklendi.`,
      "CREW",
      crew.id
    );
    return crew;
  },

  async update(id: string, data: Partial<CreateCrewInput & { status: CrewStatus }>) {
    const before = await this.getById(id);
    const updated = await prisma.crew.update({ where: { id }, data });

    if (data.status && data.status !== before.status) {
      await auditService.log(
        "CREW_STATUS_CHANGED",
        `${updated.name} durumu "${statusTr(before.status)}" -> "${statusTr(updated.status)}" olarak değiştirildi.`,
        "CREW",
        updated.id
      );
    }
    return updated;
  },

  async remove(id: string) {
    const crew = await this.getById(id);
    await prisma.crew.delete({ where: { id } });
    await auditService.log(
      "CREW_DELETED",
      `${crew.name} ekip listesinden silindi.`,
      "CREW",
      id
    );
    return crew;
  },

  /**
   * Bir personelin, verilen tarihi içeren haftada (Pazartesi-Pazar)
   * atanmış olduğu uçuşlardan toplam kaç saat mesaisi olduğunu hesaplar.
   */
  async getWeeklyHours(crewId: string, referenceDate: Date): Promise<number> {
    const weekStart = dayjs(referenceDate).startOf("week");
    const weekEnd = dayjs(referenceDate).endOf("week");

    const assignments = await prisma.assignment.findMany({
      where: {
        crewId,
        flight: {
          departureTime: {
            gte: weekStart.toDate(),
            lte: weekEnd.toDate(),
          },
          status: { not: "CANCELLED" },
        },
      },
      include: { flight: true },
    });

    const totalMs = assignments.reduce((sum: number, a: (typeof assignments)[number]) => {
      const hours = dayjs(a.flight.arrivalTime).diff(a.flight.departureTime, "minute") / 60;
      return sum + hours;
    }, 0);

    return Math.round(totalMs * 100) / 100;
  },

  /** Müsait (ACTIVE) personelleri role göre filtreli döndürür */
  async listAvailable(role?: CrewRole) {
    return prisma.crew.findMany({
      where: {
        status: "ACTIVE",
        ...(role ? { role } : {}),
      },
      orderBy: { name: "asc" },
    });
  },
};

function roleTr(role: string) {
  const map: Record<string, string> = {
    PILOT: "Pilot",
    CO_PILOT: "Co-Pilot",
    CABIN_CHIEF: "Kabin Amiri",
    FLIGHT_ATTENDANT: "Hostes/Kabin Memuru",
  };
  return map[role] ?? role;
}

function statusTr(status: string) {
  const map: Record<string, string> = {
    ACTIVE: "Aktif",
    INACTIVE: "Pasif",
    ON_LEAVE: "İzinli",
  };
  return map[status] ?? status;
}
