import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import { computeDaySummary } from "@/lib/day-close";
import { isYmd } from "@/lib/business-day";

export const dynamic = "force-dynamic";

// GET /api/day-close/summary?date=YYYY-MM-DD — system totals for the audit popup.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["admin", "cashier"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const date = new URL(req.url).searchParams.get("date");
  if (!isYmd(date)) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }
  await connectDB();
  return NextResponse.json(await computeDaySummary(date));
}
