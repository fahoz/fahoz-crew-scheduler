import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors";

// Async route handler'ları try/catch yazmadan sarmak için yardımcı fonksiyon
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Girilen veriler geçersiz.",
        details: err.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
  }

  console.error("Beklenmeyen hata:", err);
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Sunucuda beklenmeyen bir hata oluştu." },
  });
}
