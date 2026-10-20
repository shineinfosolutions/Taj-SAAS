import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import DayClose from "@/lib/db/models/DayClose";
import Order from "@/lib/db/models/Order";
import {
  DAY_CLOSE_FIRST_DATE,
  dayCloseCurrentDate,
  dayCloseEnforced,
  dayCloseLockEnabled,
  pendingDayCloses,
} from "@/lib/day-close";
import { businessDateOf } from "@/lib/business-day";

export const dynamic = "force-dynamic";

// GET /api/day-close/history — admin audit register: closed days (newest
// first), pending days, the lock switch, and bills of a closed day that were
// reopened after it was closed ("after-close changes").
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();

  const current = dayCloseCurrentDate();
  const [records, pending, lockEnabled] = await Promise.all([
    DayClose.find({}).sort({ businessDate: -1 }).limit(90).lean(),
    pendingDayCloses(current),
    dayCloseLockEnabled(),
  ]);

  const oldestClose = records.reduce<Date | null>(
    (min, r) => (min === null || r.closedAt < min ? r.closedAt : min),
    null,
  );
  const reopened = oldestClose
    ? await Order.find({ reopenedAt: { $gte: oldestClose } })
        .select("kotNumber tableLabel createdAt reopenedAt reopenReason refundAmount")
        .lean()
    : [];

  const days = records.map((r) => {
    const after = reopened
      .filter(
        (o) =>
          o.reopenedAt &&
          new Date(o.reopenedAt) > new Date(r.closedAt) &&
          businessDateOf(o.createdAt) === r.businessDate,
      )
      .map((o) => ({
        kot: o.kotNumber,
        table: o.tableLabel,
        reopenedAt: o.reopenedAt,
        reason: o.reopenReason,
        refund: o.refundAmount,
      }));
    return {
      businessDate: r.businessDate,
      status: r.status,
      bills: r.summary?.bills ?? 0,
      total: r.summary?.total ?? 0,
      byMethod: r.summary?.byMethod ?? {},
      cashExpected: r.cashExpected ?? 0,
      cashCounted: r.cashCounted,
      cashDiff: r.cashDiff,
      cardReported: r.cardReported,
      upiReported: r.upiReported,
      remark: r.remark,
      overrideReason: r.overrideReason,
      pinApproved: r.pinApproved,
      closedByName: r.closedByName,
      closedByRole: r.closedByRole,
      closedAt: r.closedAt,
      afterClose: after,
    };
  });

  return NextResponse.json({
    currentBusinessDate: current,
    firstAuditDate: DAY_CLOSE_FIRST_DATE,
    enforced: dayCloseEnforced(current),
    lockEnabled,
    pending,
    days,
  });
}
