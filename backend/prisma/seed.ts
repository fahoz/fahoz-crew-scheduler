import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seed başlıyor...");

  await prisma.assignment.deleteMany();
  await prisma.flight.deleteMany();
  await prisma.crew.deleteMany();

  const crewData = [
    { name: "Ahmet Yılmaz", email: "ahmet.yilmaz@fahozair.com", role: "PILOT" as const },
    { name: "Mehmet Demir", email: "mehmet.demir@fahozair.com", role: "PILOT" as const },
    { name: "Ayşe Kaya", email: "ayse.kaya@fahozair.com", role: "CO_PILOT" as const },
    { name: "Fatma Şahin", email: "fatma.sahin@fahozair.com", role: "CO_PILOT" as const },
    { name: "Zeynep Arslan", email: "zeynep.arslan@fahozair.com", role: "CABIN_CHIEF" as const },
    { name: "Elif Çelik", email: "elif.celik@fahozair.com", role: "FLIGHT_ATTENDANT" as const },
    { name: "Merve Aydın", email: "merve.aydin@fahozair.com", role: "FLIGHT_ATTENDANT" as const },
    { name: "Burak Öztürk", email: "burak.ozturk@fahozair.com", role: "FLIGHT_ATTENDANT" as const },
    { name: "Can Yıldız", email: "can.yildiz@fahozair.com", role: "PILOT" as const },
    { name: "Deniz Koç", email: "deniz.koc@fahozair.com", role: "CO_PILOT" as const },
  ];

  const crew = await Promise.all(
    crewData.map((c) => prisma.crew.create({ data: c }))
  );
  console.log(`✅ ${crew.length} personel oluşturuldu.`);

  const now = dayjs();
  const flightData = [
    {
      flightCode: "TK1920",
      origin: "IST",
      destination: "LHR",
      departureTime: now.add(2, "hour").toDate(),
      arrivalTime: now.add(6, "hour").toDate(),
    },
    {
      flightCode: "TK1815",
      origin: "IST",
      destination: "JFK",
      departureTime: now.add(5, "hour").toDate(),
      arrivalTime: now.add(15, "hour").toDate(),
    },
    {
      flightCode: "TK2030",
      origin: "SAW",
      destination: "CDG",
      departureTime: now.add(1, "day").toDate(),
      arrivalTime: now.add(1, "day").add(4, "hour").toDate(),
    },
    {
      flightCode: "TK1055",
      origin: "IST",
      destination: "DXB",
      departureTime: now.add(10, "hour").toDate(),
      arrivalTime: now.add(14, "hour").toDate(),
    },
  ];

  const flights = await Promise.all(flightData.map((f) => prisma.flight.create({ data: f })));
  console.log(`✅ ${flights.length} uçuş oluşturuldu.`);

  // Örnek bir uçuşa kısmi atama (rol eşleşmesi eksik bırakılıyor, test için)
  await prisma.assignment.create({
    data: { flightId: flights[0].id, crewId: crew[0].id }, // Pilot
  });
  await prisma.assignment.create({
    data: { flightId: flights[0].id, crewId: crew[2].id }, // Co-Pilot
  });

  console.log("✅ Seed tamamlandı.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
