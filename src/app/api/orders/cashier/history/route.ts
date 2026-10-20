import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";
import { businessDayRange, currentBusinessDate } from "@/lib/business-day";
import type { IOrder } from "@/types";

// The current business day's settled orders for the cashier (reprint / lookup).
// Cashier + admin.
export async function GET() {
  const session = await auth();
  if (!session?.user || !["admin", "cashier"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();

  // Current business day (6 AM → 6 AM, restaurant timezone).
  const { start, end } = businessDayRange(currentBusinessDate());

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
