import { PrismaClient } from "@prisma/client";

// Tekil (singleton) Prisma Client örneği.
// Dev ortamında ts-node-dev yeniden başlatmalarında çoklu bağlantı
// oluşmasını önlemek için global cache kullanılır.
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}
