// ==========================================================
// Uygulama genelinde kullanılan özel hata sınıfları.
// Her biş kuralı ihlali kendi hata koduyla fırlatılır ki
// frontend anlamlı mesaj gösterebilsin.
// ==========================================================

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, code: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Kural 1: Çakışma
export class ScheduleConflictError extends AppError {
  constructor(message = "Personel bu zaman diliminde başka bir uçuşa atanmış.") {
    super(message, "SCHEDULE_CONFLICT", 409);
  }
}

// Kural 2: Maksimum mesai sınırı aşımı
export class WeeklyHourLimitExceededError extends AppError {
  constructor(message = "Personelin haftalık mesai sınırı aşılıyor.") {
    super(message, "WEEKLY_HOUR_LIMIT_EXCEEDED", 409);
  }
}

// Kural 3: Rol eşleşmesi (uçuş "Hazır" durumuna geçemiyor)
export class RoleRequirementNotMetError extends AppError {
  constructor(message = "Uçuş için gerekli rol dağılımı sağlanmadı.") {
    super(message, "ROLE_REQUIREMENT_NOT_MET", 409);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Kayıt bulunamadı.") {
    super(message, "NOT_FOUND", 404);
  }
}

export class DuplicateAssignmentError extends AppError {
  constructor(message = "Bu personel zaten bu uçuşa atanmış.") {
    super(message, "DUPLICATE_ASSIGNMENT", 409);
  }
}
