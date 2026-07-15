import { prisma } from "../lib/prisma";
import { NotFoundError, RoleRequirementNotMetError, AppError } from "../utils/errors";
import { config } from "../utils/config";
import { auditService } from "./auditService";
import dayjs from "dayjs";

// Bkz. prisma/schema.prisma -> FlightStatus akışı
export type FlightStatus =
  | "PLANNED"
  | "READY"
  | "TAXI"
  | "CLEARED_TAKEOFF"
  | "AIRBORNE"
  | "CLEARED_LANDING"
  | "COMPLETED"
  | "CANCELLED";

// ATC akışının sıralı listesi. "Sonraki durum" hesabı bu diziden çıkarılır.
const ATC_FLOW: FlightStatus[] = [
  "PLANNED",
  "READY",
  "TAXI",
  "CLEARED_TAKEOFF",
  "AIRBORNE",
  "CLEARED_LANDING",
  "COMPLETED",
];

const statusLabelsTr: Record<FlightStatus, string> = {
  PLANNED: "Planlandı",
  READY: "Hazır",
  TAXI: "Taksi",
  CLEARED_TAKEOFF: "Kalkışa İzin Verildi",
  AIRBORNE: "Havada",
  CLEARED_LANDING: "İnişe İzin Verildi",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};

interface CreateFlightInput {
  flightCode: string;
  origin: string;
  destination: string;
  departureTime: string | Date;
  arrivalTime: string | Date;
}

interface FlightFilter {
  status?: FlightStatus;
  search?: string; // uçuş kodu veya güzergah içinde arama
  from?: string; // ISO tarih - kalkış bu tarihten sonra
  to?: string; // ISO tarih - kalkış bu tarihten önce
}

export const flightService = {
  async list(filter: FlightFilter = {}) {
    const where: any = {};

    if (filter.status) where.status = filter.status;

    if (filter.search) {
      where.OR = [
        { flightCode: { contains: filter.search } },
        { origin: { contains: filter.search } },
        { destination: { contains: filter.search } },
      ];
    }

    if (filter.from || filter.to) {
      where.departureTime = {};
      if (filter.from) where.departureTime.gte = new Date(filter.from);
      if (filter.to) where.departureTime.lte = new Date(filter.to);
    }

    return prisma.flight.findMany({
      where,
      orderBy: { departureTime: "asc" },
      include: { assignments: { include: { crew: true } } },
    });
  },

  async getById(id: string) {
    const flight = await prisma.flight.findUnique({
      where: { id },
      include: { assignments: { include: { crew: true } } },
    });
    if (!flight) throw new NotFoundError("Uçuş bulunamadı.");
    return flight;
  },

  async create(input: CreateFlightInput) {
    const flight = await prisma.flight.create({
      data: {
        flightCode: input.flightCode,
        origin: input.origin,
        destination: input.destination,
        departureTime: new Date(input.departureTime),
        arrivalTime: new Date(input.arrivalTime),
      },
    });
    await auditService.log(
      "FLIGHT_CREATED",
      `${flight.flightCode} (${flight.origin} → ${flight.destination}) uçuş listesine eklendi.`,
      "FLIGHT",
      flight.id
    );
    return flight;
  },

  async update(id: string, data: Partial<CreateFlightInput & { status: FlightStatus }>) {
    await this.getById(id);
    return prisma.flight.update({
      where: { id },
      data: {
        ...data,
        departureTime: data.departureTime ? new Date(data.departureTime) : undefined,
        arrivalTime: data.arrivalTime ? new Date(data.arrivalTime) : undefined,
      },
    });
  },

  async remove(id: string) {
    const flight = await this.getById(id);
    await prisma.flight.delete({ where: { id } });
    await auditService.log(
      "FLIGHT_DELETED",
      `${flight.flightCode} uçuş listesinden silindi.`,
      "FLIGHT",
      id
    );
    return flight;
  },

  async todayFlights() {
    const start = dayjs().startOf("day").toDate();
    const end = dayjs().endOf("day").toDate();
    return prisma.flight.findMany({
      where: { departureTime: { gte: start, lte: end } },
      orderBy: { departureTime: "asc" },
      include: { assignments: { include: { crew: true } } },
    });
  },

  /**
   * KURAL 3: Rol Eşleşmesi.
   * Bir uçuşu "Hazır" (READY) durumuna geçirmek için:
   *  - En az 1 Pilot
   *  - En az 1 Co-Pilot
   *  - En az 2 Kabin Amiri/Hostes (CABIN_CHIEF + FLIGHT_ATTENDANT toplamı)
   * atanmış olmalı. Aksi halde hata fırlatılır.
   */
  async markReady(flightId: string) {
    const flight = await this.getById(flightId);

    const roleCounts = { PILOT: 0, CO_PILOT: 0, CABIN_CREW: 0 };
    for (const a of flight.assignments) {
      if (a.crew.role === "PILOT") roleCounts.PILOT++;
      else if (a.crew.role === "CO_PILOT") roleCounts.CO_PILOT++;
      else if (a.crew.role === "CABIN_CHIEF" || a.crew.role === "FLIGHT_ATTENDANT")
        roleCounts.CABIN_CREW++;
    }

    const req = config.rolesRequiredForReady;
    const missing: string[] = [];
    if (roleCounts.PILOT < req.PILOT) missing.push(`${req.PILOT} Pilot`);
    if (roleCounts.CO_PILOT < req.CO_PILOT) missing.push(`${req.CO_PILOT} Co-Pilot`);
    if (roleCounts.CABIN_CREW < req.CABIN_CREW) missing.push(`${req.CABIN_CREW} Kabin Ekibi`);

    if (missing.length > 0) {
      throw new RoleRequirementNotMetError(
        `Uçuş "Hazır" duruma alınamıyor. Şunlar eksik: ${missing.join(", ")}. Lütfen Uçuş Planlama ekranından eksik personeli atayın.`
      );
    }

    const updated = await prisma.flight.update({
      where: { id: flightId },
      data: { status: "READY" },
    });

    await auditService.log(
      "FLIGHT_STATUS_CHANGED",
      `${flight.flightCode} "Hazır" durumuna alındı.`,
      "FLIGHT",
      flightId
    );

    return updated;
  },

  /** Bir uçuşun mevcut rol dağılımını ve eksiklerini hesaplar (UI'da göstermek için) */
  async getReadinessSummary(flightId: string) {
    const flight = await this.getById(flightId);
    const req = config.rolesRequiredForReady;

    const counts = { PILOT: 0, CO_PILOT: 0, CABIN_CREW: 0 };
    for (const a of flight.assignments) {
      if (a.crew.role === "PILOT") counts.PILOT++;
      else if (a.crew.role === "CO_PILOT") counts.CO_PILOT++;
      else counts.CABIN_CREW++;
    }

    return {
      flightId,
      counts,
      required: req,
      isReady:
        counts.PILOT >= req.PILOT &&
        counts.CO_PILOT >= req.CO_PILOT &&
        counts.CABIN_CREW >= req.CABIN_CREW,
    };
  },

  /**
   * ATC AKIŞI: Uçuşu bir sonraki aşamaya ilerletir.
   * Sıra: PLANNED -> READY -> TAXI -> CLEARED_TAKEOFF -> AIRBORNE
   *       -> CLEARED_LANDING -> COMPLETED
   * READY durumuna geçiş zaten markReady() ile ayrı kontrol edildiği için
   * bu fonksiyon READY'den itibaren ilerletir (PLANNED->READY için markReady kullanılmalı).
   */
  async advanceAtcStatus(flightId: string) {
    const flight = await this.getById(flightId);
    const current = flight.status as FlightStatus;

    if (current === "CANCELLED" || current === "COMPLETED") {
      throw new AppError(
        `Bu uçuş zaten "${statusLabelsTr[current]}" durumunda, ilerletilemez.`,
        "INVALID_STATUS_TRANSITION",
        409
      );
    }

    if (current === "PLANNED") {
      throw new AppError(
        `Önce uçuşu "Hazır" durumuna almalısınız (gerekli mürettebat ataması tamamlanmalı).`,
        "INVALID_STATUS_TRANSITION",
        409
      );
    }

    const currentIndex = ATC_FLOW.indexOf(current);
    const next = ATC_FLOW[currentIndex + 1];

    if (!next) {
      throw new AppError(`Bu uçuş için ilerletilecek bir sonraki durum yok.`, "NO_NEXT_STATUS", 409);
    }

    const updated = await prisma.flight.update({
      where: { id: flightId },
      data: { status: next },
    });

    await auditService.log(
      "FLIGHT_STATUS_CHANGED",
      `${flight.flightCode} durumu "${statusLabelsTr[current]}" -> "${statusLabelsTr[next]}" olarak güncellendi.`,
      "FLIGHT",
      flightId
    );

    return updated;
  },

  async cancel(flightId: string) {
    const flight = await this.getById(flightId);
    if (flight.status === "COMPLETED") {
      throw new AppError(`Tamamlanmış bir uçuş iptal edilemez.`, "INVALID_STATUS_TRANSITION", 409);
    }
    const updated = await prisma.flight.update({
      where: { id: flightId },
      data: { status: "CANCELLED" },
    });
    await auditService.log(
      "FLIGHT_CANCELLED",
      `${flight.flightCode} uçuşu iptal edildi.`,
      "FLIGHT",
      flightId
    );
    return updated;
  },

  /**
   * Basit, deterministik hava durumu simülasyonu (gerçek API kullanmaz).
   * Uçuş id'sine göre sabit ama uçuştan uçuşa farklı görünen bir
   * rüzgar yönü/hızı ve durum rozetleri üretir.
   */
  simulateWeather(flightId: string) {
    let seed = 0;
    for (let i = 0; i < flightId.length; i++) seed += flightId.charCodeAt(i);

    const windDirections = ["K", "KD", "D", "GD", "G", "GB", "B", "KB"];
    const windDirection = windDirections[seed % windDirections.length];
    const windSpeed = 5 + (seed % 35); // 5-39 knot arası

    let condition: "UYGUN" | "DIKKATLI" | "UYGUN_DEGIL";
    if (windSpeed < 15) condition = "UYGUN";
    else if (windSpeed < 28) condition = "DIKKATLI";
    else condition = "UYGUN_DEGIL";

    const conditionLabels = {
      UYGUN: "Uçuşa Uygun",
      DIKKATLI: "Dikkatli Olunmalı",
      UYGUN_DEGIL: "Uçuşa Uygun Değil",
    };

    return {
      windDirection,
      windSpeed,
      condition,
      conditionLabel: conditionLabels[condition],
    };
  },
};

export { statusLabelsTr, ATC_FLOW };
