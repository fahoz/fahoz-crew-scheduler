import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  weeklyHourLimit: Number(process.env.WEEKLY_HOUR_LIMIT ?? 40),
  rolesRequiredForReady: {
    PILOT: Number(process.env.MIN_PILOT ?? 1),
    CO_PILOT: Number(process.env.MIN_CO_PILOT ?? 1),
    CABIN_CREW: Number(process.env.MIN_CABIN_CREW ?? 2), // CABIN_CHIEF + FLIGHT_ATTENDANT toplamı
  },
};
