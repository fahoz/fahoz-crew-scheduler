// ==========================================================
// E-Posta Simülasyon Servisi
// Gerçek bir SMTP sağlayıcısı (Resend, Nodemailer vb.) bağlamak
// isterseniz, sendMail fonksiyonunun içini değiştirmeniz yeterli.
// Şimdilik konsola şık formatlanmış bir bildirim basıyoruz.
// ==========================================================

interface AssignmentMailPayload {
  crewName: string;
  crewEmail: string;
  flightCode: string;
  origin: string;
  destination: string;
  departureTime: Date;
}

export function sendAssignmentMail(payload: AssignmentMailPayload) {
  const { crewName, crewEmail, flightCode, origin, destination, departureTime } = payload;

  const subject = `Yeni Uçuş Göreviniz: ${flightCode} - ${origin}-${destination}`;
  const body = [
    `Sayın ${crewName},`,
    ``,
    `${flightCode} numaralı uçuşa atandınız.`,
    `Güzergah: ${origin} -> ${destination}`,
    `Kalkış: ${departureTime.toLocaleString("tr-TR")}`,
    ``,
    `İyi uçuşlar dileriz.`,
    `Fahoz Air Ops - Vardiya Planlama Sistemi`,
  ].join("\n");

  // --- SİMÜLASYON ÇIKTISI ---
  console.log("\n📧 ================ E-POSTA GÖNDERİLDİ ================");
  console.log(`Kime: ${crewEmail}`);
  console.log(`Konu: ${subject}`);
  console.log(`--------------------------------------------------------`);
  console.log(body);
  console.log("========================================================\n");

  return { subject, body, to: crewEmail, sentAt: new Date() };
}
