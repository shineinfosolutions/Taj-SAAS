import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Branding from "@/lib/db/models/Branding";

export const dynamic = "force-dynamic";

// PATCH /api/day-close/settings { lockEnabled } — admin ON/OFF switch for the
// "no billing until the day is audited" lock. OFF = payments always allowed.
export async function PATCH(req: NextRequest) {
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
  if (typeof body.lockEnabled !== "boolean") {
    return NextResponse.json({ error: "lockEnabled must be true/false" }, { status: 400 });
  }
  await connectDB();
  const updated = await Branding.findOneAndUpdate(
    {},
    { $set: { dayCloseLockEnabled: body.lockEnabled } },
    { new: true },
  )
    .select("dayCloseLockEnabled")
    .lean();
  if (!updated) {
    return NextResponse.json({ error: "Branding settings not found" }, { status: 404 });
  }
  return NextResponse.json({ lockEnabled: updated.dayCloseLockEnabled !== false });
}
