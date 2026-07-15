# Fahoz Crew Scheduler
🌐 Türkçe | **[English](README.md)**

Havalimanı uçuş ekibi ve vardiya planlama sistemi — çakışma kontrolü, haftalık mesai sınırı, rol eşleşmesi ve ATC durum takibi içeren tam yığın (full-stack) uygulama. Backend: Node.js/TypeScript/Express/Prisma, Frontend: vanilla HTML/CSS/JS.

## Özellikler

- **Ekip Yönetimi** — personel ekleme, düzenleme, silme; rol, durum (Aktif/Pasif/İzinli), toplam ve haftalık uçuş saati takibi
- **Uçuş Planlama & Atama** — uçuş oluşturma/düzenleme, duruma göre filtreleme veya uçuş kodu/güzergaha göre arama, tek tıkla personel atama
- **3 Kritik İş Kuralı** (backend'de zorunlu kılınır):
  1. **Çakışma Kontrolü** — bir personel çakışan iki uçuşa aynı anda atanamaz
  2. **Haftalık Mesai Sınırı** — atama, personelin haftalık limitini (varsayılan 40 sa) aşıyorsa engellenir
  3. **Rol Eşleşmesi** — bir uçuş ancak en az 1 Pilot, 1 Co-Pilot ve 2 Kabin Ekibi atandıktan sonra "Hazır" olarak işaretlenebilir
- **ATC Kontrol Kulesi** — genişletilmiş uçuş durum akışı (Planlandı → Hazır → Taksi → Kalkışa İzin Verildi → Havada → İnişe İzin Verildi → Tamamlandı), basit simüle edilmiş rüzgar/hava durumu
- **İşlem Geçmişi (Audit Log)** — her önemli işlem (personel/uçuş/atama oluşturma, güncelleme, kaldırma) kayıt altına alınır ve Dashboard'da gösterilir
- **Şifreli panel girişi** — basit tek kullanıcılı giriş koruması
- **Dashboard** — canlı istatistikler, bugünkü uçuşlar ve atanmış personel profil kartları, son işlemler akışı

## Kullanılan Teknolojiler

| Katman | Teknoloji |
|---|---|
| Backend | Node.js, TypeScript, Express, Prisma ORM |
| Veritabanı | PostgreSQL (Supabase) / SQLite (yerel geliştirme) |
| Frontend | Vanilla HTML, CSS, JavaScript (framework yok) |
| Deploy | Vercel (backend, serverless), Netlify (frontend), Supabase (veritabanı) |

## Proje Yapısı

```
├── backend/
│   ├── api/index.ts          # Vercel serverless giriş noktası
│   ├── prisma/schema.prisma  # Crew, Flight, Assignment, AuditLog modelleri
│   └── src/
│       ├── app.ts            # Express app (route'lar burada bağlanır)
│       ├── index.ts          # Yerel geliştirme girişi (app.listen)
│       ├── services/         # İş mantığı katmanı — kritik kurallar burada
│       └── routes/           # API endpoint'leri
└── frontend/
    ├── login.html
    ├── index.html             # Dashboard
    └── pages/{crew,flights,atc}.html
```

## Giriş Bilgileri

- **Kullanıcı adı:** admin
- **Şifre:** fahozadmin123

(`frontend/js/auth.js` içinde sabit kodlu, değiştirilebilir.)

## Yerel Kurulum

```bash
cd backend
npm install
cp .env.example .env      # DATABASE_URL'i ayarlayın (SQLite veya PostgreSQL)
npx prisma migrate dev --name init
npm run seed
npm run dev                # http://localhost:4000
```

```bash
cd frontend
npx serve .                # http://localhost:3000
```

`frontend/js/api.js` içindeki `API_BASE` değişkeninin backend adresinizle eşleştiğinden emin olun.

## Notlar

- Gerçek e-posta gönderilmiyor — atama bildirimleri backend konsolunda simüle edilir.
- ATC ekranındaki hava durumu gerçek bir API değil, deterministik bir simülasyondur.
- Bu kişisel/öğrenim amaçlı bir projedir, gerçek havayolu operasyonları için üretilmemiştir.

---

Made by Fahoz
