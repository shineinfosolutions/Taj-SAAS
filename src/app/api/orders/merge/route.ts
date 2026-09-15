import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";
import Location from "@/lib/db/models/Location";
import { withTransaction } from "@/lib/db/withTransaction";

// POST /api/orders/merge — fold several tables' bills into one "primary"
// table (e.g. a big party seated across 2-3 tables). Unlike a plain transfer,
// the source tables stay occupied (marked mergedIntoTableId) so no one can
// seat a new party there — they're only freed when the primary table's bill
// is settled (see the pay_table handler in [id]/route.ts).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (
    !session?.user ||
    !["admin", "cashier", "captain"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tableIds, intoTableId } = await req.json();
  if (!intoTableId || !Array.isArray(tableIds) || tableIds.length === 0) {
    return NextResponse.json(
      { error: "intoTableId and tableIds[] required" },
      { status: 400 },
    );
  }
  const sourceIds = [...new Set(tableIds as string[])].filter(
    (id) => id !== intoTableId,
  );
  if (sourceIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one other table to merge" },
      { status: 400 },
    );
  }

  await connectDB();

  const intoTable = await Location.findById(intoTableId);
  if (!intoTable || !intoTable.isActive) {
    return NextResponse.json(
      { error: "Primary table not found" },
      { status: 404 },
    );
  }
  if (intoTable.mergedIntoTableId) {
    return NextResponse.json(
      { error: "Primary table is itself merged into another table" },
      { status: 400 },
    );
  }

  try {
    await withTransaction(async (s) => {
      const sources = await Location.find({ _id: { $in: sourceIds } }).session(s);
      if (sources.length !== sourceIds.length) {
        throw new Error("One or more source tables not found");
      }
      for (const src of sources) {
        if (src.mergedIntoTableId) {
          throw new Error(`${src.label} is already merged into another table`);
        }
      }

      for (const src of sources) {
        const orders = await Order.find({
          tableId: src._id,
          status: { $nin: ["cleared", "paid", "cancelled"] },
        }).session(s);
        for (const o of orders) {
          o.transferredFrom = o.tableLabel;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          o.tableId = intoTable._id as any;
          o.tableLabel = intoTable.label;
          await o.save({ session: s });
        }

        await Location.findByIdAndUpdate(
          src._id,
          { isOccupied: true, mergedIntoTableId: intoTable._id },
          { session: s },
        );
      }

      await Location.findByIdAndUpdate(
        intoTableId,
        { isOccupied: true },
        { session: s },
      );
    });

    return NextResponse.json({ success: true, merged: sourceIds });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Merge failed" },
      { status: 400 },
    );
  }
}
