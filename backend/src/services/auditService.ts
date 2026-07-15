import { prisma } from "../lib/prisma";

export type AuditEntityType = "CREW" | "FLIGHT" | "ASSIGNMENT";

export const auditService = {
  /** Yeni bir işlem kaydı oluşturur. Hata fırlatmaz (loglama asıl işlemi bozmamalı). */
  async log(action: string, message: string, entityType: AuditEntityType, entityId: string) {
    try {
      await prisma.auditLog.create({
        data: { action, message, entityType, entityId },
      });
    } catch (err) {
      console.error("Audit log kaydedilemedi:", err);
    }
  },

  /** Dashboard'da gösterilecek son N işlemi getirir. */
  async recent(limit = 15) {
    return prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
};
