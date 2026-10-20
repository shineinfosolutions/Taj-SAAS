import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import DayClose from "@/lib/db/models/DayClose";
import { computeDaySummary, pendingDayCloses } from "@/lib/day-close";
import { isYmd } from "@/lib/business-day";

export const dynamic = "force-dynamic";

// POST /api/day-close/override — admin closes a pending day without the cash
// count (emergency), with a mandatory reason. The system totals are still
// snapshotted so the day shows up in the audit history.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const businessDate = body.businessDate;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!isYmd(businessDate)) {
    return NextResponse.json({ error: "businessDate required" }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: "Enter a reason for the override" }, { status: 400 });
  }

  await connectDB();
  const pending = await pendingDayCloses();
  if (!pending.includes(businessDate)) {
    return NextResponse.json(
      { error: "This day is not pending audit" },
      { status: 409 },
    );
  }

  const summary = await computeDaySummary(businessDate);
  try {
    const record = await DayClose.create({
      businessDate,
      status: "overridden",
      summary,
      cashExpected: summary.cashExpected,
      overrideReason: reason,
      closedById: session.user.id,
      closedByName: session.user.name ?? undefined,
      closedByRole: session.user.role,
      closedAt: new Date(),
    });
    return NextResponse.json({ success: true, record }, { status: 201 });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) {
      return NextResponse.json(
        { error: "This day has already been audited" },
        { status: 409 },
      );
    }
    console.error("[POST /api/day-close/override]", e);
    return NextResponse.json({ error: "Could not save the override" }, { status: 500 });
  }
}
