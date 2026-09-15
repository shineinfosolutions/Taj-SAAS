import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";
import Staff from "@/lib/db/models/Staff";
import AdminUser from "@/lib/db/models/AdminUser";

/**
 * Per-cashier billing report for a date (default today): who collected how
 * much, and via which payment method. Read-only — never touches KOTs.
 * ?date=YYYY-MM-DD. Admin sees every cashier; a cashier only ever sees their
 * own row (the cashierId filter is forced server-side, not client-supplied).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["admin", "cashier"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const start = new Date(`${date}T00:00:00.000`);
  const end = new Date(`${date}T23:59:59.999`);

  const query: Record<string, unknown> = {
    status: { $in: ["paid", "cleared"] },
    $or: [
      { clearedAt: { $gte: start, $lte: end } },
      { paidAt: { $gte: start, $lte: end } },
    ],
  };
  // A cashier can only ever pull their own numbers — never another cashier's.
  if (session.user.role === "cashier") {
    query.cashierId = session.user.id;
  }

  const settled = await Order.find(query).lean();

  interface Bucket {
    orderCount: number;
    total: number;
    cash: number;
    card: number;
    upi: number;
  }
  const byCashier: Record<string, Bucket> = {};

  for (const o of settled) {
    const key = o.cashierId?.toString() ?? "unknown";
    if (!byCashier[key]) {
      byCashier[key] = { orderCount: 0, total: 0, cash: 0, card: 0, upi: 0 };
    }
    const b = byCashier[key];
    b.orderCount += 1;
    b.total += o.total ?? 0;

    if (o.splitPayment && o.splitPayment.length > 0) {
      for (const p of o.splitPayment) {
        if (p.method === "cash") b.cash += p.amount ?? 0;
        else if (p.method === "card") b.card += p.amount ?? 0;
        else if (p.method === "upi") b.upi += p.amount ?? 0;
      }
    } else {
      const amount = o.paymentAmount ?? o.total ?? 0;
      if (o.paymentMethod === "cash") b.cash += amount;
      else if (o.paymentMethod === "card") b.card += amount;
      else if (o.paymentMethod === "upi") b.upi += amount;
    }
  }

  const ids = Object.keys(byCashier).filter((k) => k !== "unknown");
  const [staffDocs, adminDocs] = await Promise.all([
    Staff.find({ _id: { $in: ids } }).select("name").lean(),
    AdminUser.find({ _id: { $in: ids } }).select("name").lean(),
  ]);
  const nameById = new Map<string, string>();
  for (const s of staffDocs) nameById.set(s._id.toString(), s.name);
  for (const a of adminDocs) nameById.set(a._id.toString(), `${a.name} (Admin)`);

  const cashiers = Object.entries(byCashier)
    .map(([cashierId, b]) => ({
      cashierId,
      name: cashierId === "unknown" ? "Unassigned" : nameById.get(cashierId) ?? "Former Staff",
      orderCount: b.orderCount,
      total: Math.round(b.total * 100) / 100,
      cash: Math.round(b.cash * 100) / 100,
      card: Math.round(b.card * 100) / 100,
      upi: Math.round(b.upi * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total);

  const grandTotal = Math.round(
    cashiers.reduce((s, c) => s + c.total, 0) * 100,
  ) / 100;

  return NextResponse.json({ date, cashiers, grandTotal });
}
