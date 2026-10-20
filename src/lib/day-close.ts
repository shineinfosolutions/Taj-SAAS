// Day-close audit (server only). A business day (6 AM → 6 AM) must be audited
// before payments are taken in the next one. Only settlement is gated — orders,
// KOTs and KOT printing never look at any of this.
import Order from "@/lib/db/models/Order";
import Branding from "@/lib/db/models/Branding";
import DayClose from "@/lib/db/models/DayClose";
import { kotPrintState } from "@/lib/kot-print";
import {
  addDays,
  businessDateOf,
  businessDayRange,
} from "@/lib/business-day";
import type { IOrder } from "@/types";

/** First business day that has to be audited (its popup shows 21 Oct, 6 AM). */
export const DAY_CLOSE_FIRST_DATE = "2026-10-20";

/** Cash difference (₹) above which the manager PIN is required. */
export const DAY_CLOSE_PIN_THRESHOLD = 500;

/** Only look this far back for unaudited days. */
const LOOKBACK_DAYS = 45;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * "Now" for day-close decisions. In development DAY_CLOSE_TEST_NOW can pin it
 * (e.g. to the morning of 21 Oct) to try the popup without waiting.
 */
export function dayCloseNow(): Date {
  const pinned = process.env.DAY_CLOSE_TEST_NOW;
  if (process.env.NODE_ENV !== "production" && pinned) return new Date(pinned);
  return new Date();
}

export function dayCloseCurrentDate(): string {
  return businessDateOf(dayCloseNow());
}

/** True once the rule is live (from the business day after the first audited one). */
export function dayCloseEnforced(current = dayCloseCurrentDate()): boolean {
  return current > DAY_CLOSE_FIRST_DATE;
}

export async function dayCloseLockEnabled(): Promise<boolean> {
  const b = await Branding.findOne({}).select("dayCloseLockEnabled").lean();
  return b?.dayCloseLockEnabled !== false;
}

function settledIn(start: Date, end: Date) {
  return {
    status: { $in: ["paid", "cleared"] as ("paid" | "cleared")[] },
    $or: [
      { clearedAt: { $gte: start, $lte: end } },
      { paidAt: { $gte: start, $lte: end } },
    ],
  };
}

/**
 * Business days still waiting for an audit, oldest first. Days with no settled
 * bill at all are closed automatically ("no sales") and never block billing.
 */
export async function pendingDayCloses(
  current = dayCloseCurrentDate(),
): Promise<string[]> {
  if (!dayCloseEnforced(current)) return [];
  const earliest = [DAY_CLOSE_FIRST_DATE, addDays(current, -LOOKBACK_DAYS)].sort()[1];
  const candidates: string[] = [];
  for (let d = earliest; d < current; d = addDays(d, 1)) candidates.push(d);
  if (!candidates.length) return [];

  const done = new Set(
    (
      await DayClose.find({ businessDate: { $in: candidates } })
        .select("businessDate")
        .lean()
    ).map((r) => r.businessDate),
  );

  const pending: string[] = [];
  for (const d of candidates) {
    if (done.has(d)) continue;
    const { start, end } = businessDayRange(d);
    const hadSales = await Order.exists(settledIn(start, end));
    if (hadSales) {
      pending.push(d);
    } else {
      // Nothing was billed — close it on the spot (idempotent on businessDate).
      await DayClose.updateOne(
        { businessDate: d },
        {
          $setOnInsert: {
            businessDate: d,
            status: "auto_no_sales",
            closedAt: new Date(),
            closedByName: "System",
            closedByRole: "system",
          },
        },
        { upsert: true },
      ).catch(() => null);
    }
  }
  return pending;
}

/**
 * Non-null when payments must be refused right now: the rule is live, the lock
 * is switched on and an earlier business day still needs its audit.
 */
export async function billingBlock(): Promise<{ pendingDate: string } | null> {
  const current = dayCloseCurrentDate();
  if (!dayCloseEnforced(current)) return null;
  if (!(await dayCloseLockEnabled())) return null;
  const pending = await pendingDayCloses(current);
  return pending.length ? { pendingDate: pending[0] } : null;
}

export interface DaySummary {
  businessDate: string;
  start: string;
  end: string;
  bills: number;
  kots: number;
  firstBillAt: string | null;
  lastBillAt: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  roundOff: number;
  total: number;
  byMethod: Record<string, number>;
  cashExpected: number;
  nc: { count: number; value: number };
  discounts: {
    table: string;
    kots: string[];
    amount: number;
    reason?: string;
    approved?: boolean;
  }[];
  cancelled: {
    kot: string;
    table: string;
    total: number;
    by?: string;
    reason?: string;
  }[];
  reopened: {
    kot: string;
    table: string;
    reason?: string;
    refund?: number;
  }[];
  kotPrint: { printed: number; notPrinted: number; notRecorded: number };
  openTables: { count: number; kots: number; total: number; tables: string[] };
}

/** System totals for one business day (by payment time). Read-only. */
export async function computeDaySummary(businessDate: string): Promise<DaySummary> {
  const { start, end } = businessDayRange(businessDate);

  const [settled, cancelled, reopened, placed, open] = await Promise.all([
    Order.find(settledIn(start, end))
      .select(
        "tableId tableLabel kotNumber items subtotal tax total roundOff discountAmount discountReason discountApproved paymentMethod splitPayment clearedAt paidAt",
      )
      .lean<IOrder[]>(),
    Order.find({
      status: "cancelled",
      $or: [
        { cancelledAt: { $gte: start, $lte: end } },
        { cancelledAt: { $exists: false }, updatedAt: { $gte: start, $lte: end } },
      ],
    })
      .select("kotNumber tableLabel total cancelledByName voidedByName cancelReason voidReason")
      .lean<IOrder[]>(),
    Order.find({ reopenedAt: { $gte: start, $lte: end } })
      .select("kotNumber tableLabel reopenReason refundAmount")
      .lean<IOrder[]>(),
    Order.find({
      createdAt: { $gte: start, $lte: end },
      status: { $nin: ["cancelled", "pending_captain"] },
    })
      .select("kotPrinted createdAt")
      .lean<IOrder[]>(),
    Order.find({
      status: {
        $in: ["pending", "preparing", "partially_ready", "ready", "partially_delivered", "delivered"],
      },
      createdAt: { $lte: end },
    })
      .select("tableLabel total")
      .lean<IOrder[]>(),
  ]);

  interface Bill {
    table: string;
    kots: string[];
    total: number;
    discount: number;
    reason?: string;
    approved?: boolean;
    method: string;
    split?: { method: string; amount: number }[];
  }
  const bills = new Map<string, Bill>();
  let subtotal = 0;
  let tax = 0;
  let discount = 0;
  let roundOff = 0;
  let total = 0;
  let ncCount = 0;
  let ncValue = 0;
  let first: number | null = null;
  let last: number | null = null;

  for (const o of settled) {
    subtotal += o.subtotal ?? 0;
    tax += o.tax ?? 0;
    discount += o.discountAmount ?? 0;
    roundOff += o.roundOff ?? 0;
    total += o.total ?? 0;
    for (const it of o.items ?? []) {
      if (it.itemStatus === "cancelled" || !it.isNC) continue;
      ncCount += 1;
      ncValue += it.price * it.quantity;
    }
    const when = new Date(o.clearedAt ?? o.paidAt ?? 0).getTime();
    first = first === null ? when : Math.min(first, when);
    last = last === null ? when : Math.max(last, when);

    const key = `${String(o.tableId)}|${when}`;
    const bill = bills.get(key) ?? {
      table: o.tableLabel,
      kots: [],
      total: 0,
      discount: 0,
      method: o.paymentMethod ?? "unknown",
    };
    bill.kots.push(o.kotNumber);
    bill.total += o.total ?? 0;
    bill.discount += o.discountAmount ?? 0;
    bill.reason ||= o.discountReason;
    if (o.discountApproved) bill.approved = true;
    if (o.splitPayment?.length) bill.split = o.splitPayment;
    bills.set(key, bill);
  }

  const byMethod: Record<string, number> = { cash: 0, card: 0, upi: 0 };
  for (const b of bills.values()) {
    if (b.split) {
      for (const p of b.split) byMethod[p.method] = (byMethod[p.method] ?? 0) + (p.amount ?? 0);
    } else {
      byMethod[b.method] = (byMethod[b.method] ?? 0) + b.total;
    }
  }

  const kotPrint = { printed: 0, notPrinted: 0, notRecorded: 0 };
  for (const o of placed) {
    const s = kotPrintState(o);
    if (s === "printed") kotPrint.printed += 1;
    else if (s === "not_printed") kotPrint.notPrinted += 1;
    else kotPrint.notRecorded += 1;
  }

  return {
    businessDate,
    start: start.toISOString(),
    end: end.toISOString(),
    bills: bills.size,
    kots: settled.length,
    firstBillAt: first === null ? null : new Date(first).toISOString(),
    lastBillAt: last === null ? null : new Date(last).toISOString(),
    subtotal: round2(subtotal),
    discount: round2(discount),
    tax: round2(tax),
    roundOff: round2(roundOff),
    total: round2(total),
    byMethod: Object.fromEntries(Object.entries(byMethod).map(([m, v]) => [m, round2(v)])),
    cashExpected: round2(byMethod.cash ?? 0),
    nc: { count: ncCount, value: round2(ncValue) },
    discounts: [...bills.values()]
      .filter((b) => b.discount > 0)
      .map((b) => ({
        table: b.table,
        kots: b.kots,
        amount: round2(b.discount),
        reason: b.reason,
        approved: b.approved,
      })),
    cancelled: cancelled.map((o) => ({
      kot: o.kotNumber,
      table: o.tableLabel,
      total: round2(o.total ?? 0),
      by: o.cancelledByName || o.voidedByName,
      reason: o.cancelReason || o.voidReason,
    })),
    reopened: reopened.map((o) => ({
      kot: o.kotNumber,
      table: o.tableLabel,
      reason: o.reopenReason,
      refund: o.refundAmount,
    })),
    kotPrint,
    openTables: {
      count: new Set(open.map((o) => o.tableLabel)).size,
      kots: open.length,
      total: round2(open.reduce((s, o) => s + (o.total ?? 0), 0)),
      tables: [...new Set(open.map((o) => o.tableLabel))],
    },
  };
}
