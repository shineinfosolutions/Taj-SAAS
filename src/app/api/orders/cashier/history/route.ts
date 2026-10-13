import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";
import { todayInTz, startOfDayTz, endOfDayTz } from "@/lib/time";
import type { IOrder } from "@/types";

// Today's settled orders for the cashier (reprint / lookup). Cashier + admin.
export async function GET() {
  const session = await auth();
  if (!session?.user || !["admin", "cashier"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();

  // "Today" in the restaurant timezone, not the server's (Vercel runs UTC).
  const today = todayInTz();
  const start = startOfDayTz(today);
  const end = endOfDayTz(today);

  const orders = await Order.find({
    status: { $in: ["paid", "cleared"] },
    $or: [
      { clearedAt: { $gte: start, $lte: end } },
      { paidAt: { $gte: start, $lte: end } },
    ],
  })
    .sort({ clearedAt: -1, paidAt: -1 })
    .limit(300)
    .lean<IOrder[]>();

  return NextResponse.json(orders);
}
