import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Branding from "@/lib/db/models/Branding";
import DayClose from "@/lib/db/models/DayClose";
import {
  DAY_CLOSE_FIRST_DATE,
  DAY_CLOSE_PIN_THRESHOLD,
  computeDaySummary,
  dayCloseCurrentDate,
  dayCloseEnforced,
  dayCloseLockEnabled,
  pendingDayCloses,
} from "@/lib/day-close";
import { isYmd } from "@/lib/business-day";

export const dynamic = "force-dynamic";

const round2 = (n: number) => Math.round(n * 100) / 100;

// ─── GET /api/day-close — audit status for the cashier popup ────────────────
export async function GET() {
  const session = await auth();
  if (!session?.user || !["admin", "cashier"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();

  const current = dayCloseCurrentDate();
  const enforced = dayCloseEnforced(current);
  const [lockEnabled, pending] = await Promise.all([
    dayCloseLockEnabled(),
    pendingDayCloses(current),
  ]);

  return NextResponse.json({
    currentBusinessDate: current,
    firstAuditDate: DAY_CLOSE_FIRST_DATE,
    enforced,
    lockEnabled,
    pending,
    blocked: enforced && lockEnabled && pending.length > 0,
    pinThreshold: DAY_CLOSE_PIN_THRESHOLD,
  });
}

// ─── POST /api/day-close — submit the audit for one business day ────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["admin", "cashier"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const businessDate = body.businessDate;
  if (!isYmd(businessDate)) {
    return NextResponse.json({ error: "businessDate required" }, { status: 400 });
  }
  const num = (v: unknown) =>
    v === undefined || v === null || v === "" ? undefined : Number(v);
  const cashCounted = num(body.cashCounted);
  const cardReported = num(body.cardReported);
  const upiReported = num(body.upiReported);
  if (cashCounted === undefined || !Number.isFinite(cashCounted) || cashCounted < 0) {
    return NextResponse.json(
      { error: "Drawer mein gina hua cash bharein" },
      { status: 400 },
    );
  }
  for (const v of [cardReported, upiReported]) {
    if (v !== undefined && (!Number.isFinite(v) || v < 0)) {
      return NextResponse.json({ error: "Card / UPI amount galat hai" }, { status: 400 });
    }
  }
  const remark = typeof body.remark === "string" ? body.remark.trim() : "";

  await connectDB();

  // Days must be closed in order, and only once they're over.
  const pending = await pendingDayCloses();
  if (!pending.includes(businessDate)) {
    const already = await DayClose.exists({ businessDate });
    return NextResponse.json(
      {
        error: already
          ? "Is din ka audit pehle hi ho chuka hai"
          : "Is din ka audit abhi nahi ho sakta",
      },
      { status: 409 },
    );
  }
  if (pending[0] !== businessDate) {
    return NextResponse.json(
      { error: `Pehle ${pending[0]} ka audit karein` },
      { status: 409 },
    );
  }

  // Server-side totals — never the client's numbers.
  const summary = await computeDaySummary(businessDate);
  const cashDiff = round2(cashCounted - summary.cashExpected);

  if (cashDiff !== 0 && !remark) {
    return NextResponse.json(
      { error: "Cash mein fark hai — remark likhna zaroori hai" },
      { status: 400 },
    );
  }

  // A big cash difference needs the manager PIN (if one is configured).
  let pinApproved = false;
  if (Math.abs(cashDiff) > DAY_CLOSE_PIN_THRESHOLD) {
    const branding = await Branding.findOne({}).select("managerPinHash").lean();
    if (branding?.managerPinHash) {
      const pin = typeof body.managerPin === "string" ? body.managerPin.trim() : "";
      if (!pin || !(await bcrypt.compare(pin, branding.managerPinHash))) {
        return NextResponse.json(
          {
            error: `₹${DAY_CLOSE_PIN_THRESHOLD} se zyada fark — sahi manager PIN chahiye`,
            needsPin: true,
          },
          { status: 403 },
        );
      }
      pinApproved = true;
    }
  }

  try {
    const record = await DayClose.create({
      businessDate,
      status: "closed",
      summary,
      cashExpected: summary.cashExpected,
      cashCounted: round2(cashCounted),
      cashDiff,
      cardReported: cardReported === undefined ? undefined : round2(cardReported),
      upiReported: upiReported === undefined ? undefined : round2(upiReported),
      remark: remark || undefined,
      pinApproved,
      closedById: session.user.id,
      closedByName: session.user.name ?? undefined,
      closedByRole: session.user.role,
      closedAt: new Date(),
    });
    return NextResponse.json({ success: true, record }, { status: 201 });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) {
      return NextResponse.json(
        { error: "Is din ka audit pehle hi ho chuka hai" },
        { status: 409 },
      );
    }
    console.error("[POST /api/day-close]", e);
    return NextResponse.json({ error: "Audit save nahi hua" }, { status: 500 });
  }
}
