// Business day: the restaurant's trading day runs from 06:00 to 05:59 the next
// morning (restaurant timezone), so a bill paid at 2 AM belongs to the evening
// before. Every money report, the cashier screens and the day-close audit use
// this — never the server's clock (Vercel runs UTC).
//
// Pure Intl/Date code, so it runs the same on the server and in the browser.
import { APP_TZ, startOfDayTz, todayInTz } from "./time";

export const BUSINESS_DAY_START_HOUR = Number(
  process.env.NEXT_PUBLIC_BUSINESS_DAY_START_HOUR ?? 6,
);

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** "YYYY-MM-DD" business date an instant belongs to. */
export function businessDateOf(at: Date | string | number = new Date()): string {
  const t = new Date(at).getTime() - BUSINESS_DAY_START_HOUR * HOUR_MS;
  return todayInTz(APP_TZ, new Date(t));
}

/** The business day running right now. */
export function currentBusinessDate(): string {
  return businessDateOf(new Date());
}

/** First and last instant (inclusive) of a business day. */
export function businessDayRange(ymd: string): { start: Date; end: Date } {
  const start = new Date(
    startOfDayTz(ymd, APP_TZ).getTime() + BUSINESS_DAY_START_HOUR * HOUR_MS,
  );
  return { start, end: new Date(start.getTime() + DAY_MS - 1) };
}

/** Range covering business days `from`..`to` (inclusive, either order). */
export function businessRange(from: string, to: string): { start: Date; end: Date } {
  const [a, b] = from <= to ? [from, to] : [to, from];
  return { start: businessDayRange(a).start, end: businessDayRange(b).end };
}

/** Shift a "YYYY-MM-DD" date by whole days. */
export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function isYmd(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/** e.g. "19 Oct, 6:00 AM – 20 Oct, 5:59 AM" */
export function businessDayLabel(ymd: string): string {
  const { start, end } = businessDayRange(ymd);
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-IN", {
      timeZone: APP_TZ,
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  return `${fmt(start)} – ${fmt(end)}`;
}

/** Hour of day (0–23) in the restaurant timezone. */
export function hourInTz(at: Date | string | number): number {
  const h = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: APP_TZ,
      hour: "numeric",
      hour12: false,
    }).format(new Date(at)),
  );
  return h === 24 ? 0 : h;
}

/** Sort key so hours run 06, 07 … 23, 00 … 05 within a business day. */
export function businessHourOrder(hour: number): number {
  return (hour - BUSINESS_DAY_START_HOUR + 24) % 24;
}
