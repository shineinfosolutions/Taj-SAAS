import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";
import {
  businessDayRange,
  currentBusinessDate,
  isYmd,
} from "@/lib/business-day";

export const dynamic = "force-dynamic";

/**
 * Invoice totals for a business day (default: the current one, 6 AM → 6 AM),
 * from settled orders by payment time. Computed on the server with no row
 * limit so the figure is the full day's total. ?date=YYYY-MM-DD.
 * Admin + cashier only.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["admin", "cashier"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();

  const param = new URL(req.url).searchParams.get("date");
  const date = isYmd(param) ? param : currentBusinessDate();
  const { start, end } = businessDayRange(date);

  const settled = await Order.find({
    status: { $in: ["paid", "cleared"] },
    $or: [
      { clearedAt: { $gte: start, $lte: end } },
      { paidAt: { $gte: start, $lte: end } },
    ],
  })
    .select(
      "tableId subtotal tax total discountAmount paymentMethod splitPayment clearedAt paidAt",
    )
    .lean();

  // A table settled in one go shares a single settle timestamp across its KOTs,
  // so {table, timestamp} identifies one customer bill.
  interface Bill {
    total: number;
    method: string;
    split?: { method: string; amount: number }[];
  }
  const bills = new Map<string, Bill>();
  let subtotal = 0;
  let tax = 0;
  let discount = 0;
  let total = 0;

  for (const o of settled) {
    subtotal += o.subtotal ?? 0;
    tax += o.tax ?? 0;
    discount += o.discountAmount ?? 0;
    total += o.total ?? 0;

    const when = o.clearedAt ?? o.paidAt;
    const key = `${o.tableId?.toString()}|${when ? new Date(when).getTime() : ""}`;
    const bill = bills.get(key) ?? {
      total: 0,
      method: o.paymentMethod ?? "unknown",
    };
    bill.total += o.total ?? 0;
    if (o.splitPayment?.length) bill.split = o.splitPayment;
    bills.set(key, bill);
  }

  const byMethod: Record<string, number> = { cash: 0, card: 0, upi: 0 };
  for (const bill of bills.values()) {
    if (bill.split) {
      for (const p of bill.split) {
        byMethod[p.method] = (byMethod[p.method] ?? 0) + (p.amount ?? 0);
      }
    } else {
      byMethod[bill.method] = (byMethod[bill.method] ?? 0) + bill.total;
    }
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  return NextResponse.json({
    date,
    bills: bills.size,
    kots: settled.length,
    subtotal: round(subtotal),
    discount: round(discount),
    tax: round(tax),
    total: round(total),
    byMethod: Object.fromEntries(
      Object.entries(byMethod).map(([m, v]) => [m, round(v)]),
    ),
  });
}
