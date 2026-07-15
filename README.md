# Havalimanı Uçuş Ekibi & Vardiya Planlama Sistemi

Katmanlı mimaride geliştirilmiş tam yığın (full-stack) bir crew scheduling sistemi.

## Mimari

```
crew-schedule/
├── backend/                  # Node.js + TypeScript + Express + Prisma
│   ├── prisma/
│   │   ├── schema.prisma     # Crew, Flight, Assignment modelleri
│   │   └── seed.ts           # Örnek veri
│   └── src/
│       ├── lib/prisma.ts     # Prisma client singleton
│       ├── utils/            # config, errors, validators (zod)
│       ├── services/         # İş mantığı katmanı (kritik kurallar burada)
│       │   ├── crewService.ts
│       │   ├── flightService.ts
│       │   ├── assignmentService.ts   <-- Kural 1 & 2
│       │   ├── mailService.ts         <-- E-posta simülasyonu
│       │   └── pdfService.ts          <-- Görev Belgesi PDF
│       ├── routes/            # Express route/controller katmanı
│       ├── middleware/        # errorHandler
│       └── index.ts           # App entry point
└── frontend/                  # Vanilla HTML/CSS/JS (kurumsal dark panel)
    ├── css/style.css
    ├── js/{api,layout,dashboard,crew,flights}.js
    ├── index.html              # Dashboard
    └── pages/{crew,flights}.html
```

## Giriş Bilgileri (Şifreli Panel)

Panel artık şifre korumalı. Giriş bilgileri:
- **Kullanıcı adı:** admin
- **Şifre:** fahozadmin123

Bu bilgiler `frontend/js/auth.js` dosyasında sabit kodludur, isterseniz değiştirebilirsiniz.

## Kurulum

### 1) Backend

```bash
cd backend
npm install
cp .env.example .env
# .env içindeki DATABASE_URL'i kendi PostgreSQL bağlantınıza göre düzenleyin

npx prisma migrate dev --name init   # tabloları oluşturur
npm run seed                          # örnek personel/uçuş verisi ekler
npm run dev                           # http://localhost:4000
```

### 2) Frontend

`frontend/index.html` dosyasını bir static server ile açın (CORS/fetch için file:// yerine http:// önerilir):

```bash
cd frontend
npx serve .
# veya VSCode "Live Server" eklentisi
```

Backend'in `http://localhost:4000` adresinde çalıştığından emin olun (bkz. `frontend/js/api.js` -> `API_BASE`).

## Kritik İş Kuralları (assignmentService.ts / flightService.ts)

| # | Kural | Nerede kontrol edilir | Ne zaman tetiklenir |
|---|-------|------------------------|----------------------|
| 1 | Çakışma Kontrolü | `assignmentService.assignCrewToFlight` | Atama anında |
| 2 | Haftalık Mesai Sınırı (varsayılan 40 sa) | `assignmentService.assignCrewToFlight` | Atama anında |
| 3 | Rol Eşleşmesi (1 Pilot, 1 Co-Pilot, 2 Kabin Ekibi) | `flightService.markReady` | Uçuş "Hazır" işaretlenmek istendiğinde |

Kurallardan biri ihlal edilirse backend anlamlı bir hata kodu ve mesajıyla (409) isteği reddeder; frontend bu mesajı toast bildirimi olarak gösterir.

## E-Posta ve PDF

- **E-posta simülasyonu:** Atama başarılı olduğunda `mailService.sendAssignmentMail` konsola biçimlendirilmiş bir bildirim basar. Gerçek SMTP entegrasyonu (örn. Resend) için bu fonksiyonun içini değiştirmeniz yeterli.
- **PDF Görev Belgesi:** `GET /api/assignments/:id/pdf` endpoint'i `pdfkit` ile oluşturulan resmi görev belgesini indirir. Frontend'de her atanmış personel satırında "Görev Belgesi (PDF)" linki bulunur.

## Notlar

- Bu sandbox ortamında dış ağ erişimi kısıtlı olduğundan `prisma generate`'in native engine indirme adımı burada tam çalıştırılamadı; kendi makinenizde `npm install` + `npx prisma generate` sorunsuz çalışacaktır.
- Roller: `PILOT`, `CO_PILOT`, `CABIN_CHIEF`, `FLIGHT_ATTENDANT`.
- Uçuş durumları: `PLANNED`, `READY`, `COMPLETED`, `CANCELLED`.
