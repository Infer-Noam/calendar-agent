import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";

export const APP_TIMEZONE = "Asia/Jerusalem";

export const startOfToday = (daysOffset: number = 0): Date => {
  const zonedNow = toZonedTime(new Date(), APP_TIMEZONE);
  const zonedMidnight = new Date(
    Date.UTC(zonedNow.getUTCFullYear(), zonedNow.getUTCMonth(), zonedNow.getUTCDate() + daysOffset)
  );

  return fromZonedTime(zonedMidnight, APP_TIMEZONE);
};

export const formatTime = (date: Date): string =>
  formatInTimeZone(date, APP_TIMEZONE, "HH:mm");

export const parseLocalDate = (dateString: string): Date =>
  fromZonedTime(`${dateString}T00:00:00`, APP_TIMEZONE);

export const formatDate = (date: Date): string =>
  formatInTimeZone(date, APP_TIMEZONE, "yyyy-MM-dd");

export const getLocalUtcOffset = (date: Date = new Date()): string =>
  formatInTimeZone(date, APP_TIMEZONE, "XXX");

export const formatDateTime = (date: Date): string =>
  formatInTimeZone(date, APP_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
