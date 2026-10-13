import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";
import Item from "@/lib/db/models/Item";
import "@/lib/db/models/Category"; // registers the schema so populate("categoryId") works

/**
 * Day-end / sales summary for a date (default today), based on settled orders.
 * ?date=YYYY-MM-DD, or ?from=YYYY-MM-DD&to=YYYY-MM-DD for a custom range.
 * Admin + cashier only.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["admin", "cashier"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  // Optional custom range (?from=&to=, inclusive) — falls back to the single date.
  const ymd = (v: string | null) =>
    v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  let from = ymd(searchParams.get("from")) ?? ymd(searchParams.get("to")) ?? date;
  let to = ymd(searchParams.get("to")) ?? from;
  if (from > to) [from, to] = [to, from];
  const start = new Date(`${from}T00:00:00.000`);
  const end = new Date(`${to}T23:59:59.999`);

  // Settled orders this day (paid/cleared).
  const settled = await Order.find({
    status: { $in: ["paid", "cleared"] },
    $or: [
      { clearedAt: { $gte: start, $lte: end } },
      { paidAt: { $gte: start, $lte: end } },
    ],
  }).lean();

  let sales = 0;
  let tax = 0;
  let ncValue = 0;
  let ncCount = 0;
  let itemsSold = 0;
  const byPayment: Record<string, number> = {};
  const byCategory: Record<string, { qty: number; revenue: number }> = {};
  const topItems: Record<string, { qty: number; revenue: number }> = {};
  const byHour: Record<string, number> = {};
  const byCaptain: Record<string, { orders: number; revenue: number }> = {};

  interface ItemSaleInstance {
    time: string;
    qty: number;
    tableLabel: string;
    kotNumber: string;
    orderId: string;
  }
  const itemSales: Record<
    string,
    { name: string; qty: number; revenue: number; instances: ItemSaleInstance[] }
  > = {};

  for (const o of settled) {
    sales += o.total ?? 0;
    tax += o.tax ?? 0;
    const pm = o.paymentMethod ?? "unknown";
    byPayment[pm] = (byPayment[pm] ?? 0) + (o.paymentAmount ?? o.total ?? 0);
    const when = o.clearedAt ?? o.paidAt ?? o.createdAt;
    const hour = `${new Date(when).getHours()}`.padStart(2, "0");
    byHour[hour] = (byHour[hour] ?? 0) + (o.total ?? 0);

    const cap = o.captainName?.trim() || (o.placedByRole === "cashier" ? "Cashier Desk" : "Direct / QR");
    byCaptain[cap] = {
      orders: (byCaptain[cap]?.orders ?? 0) + 1,
      revenue: (byCaptain[cap]?.revenue ?? 0) + (o.total ?? 0),
    };

    for (const it of o.items ?? []) {
      if (it.itemStatus === "cancelled") continue;
      if (it.isNC) {
        ncCount += 1;
        ncValue += it.price * it.quantity;
        continue;
      }
      itemsSold += it.quantity;
      const rev = it.price * it.quantity;
      topItems[it.name] = {
        qty: (topItems[it.name]?.qty ?? 0) + it.quantity,
        revenue: (topItems[it.name]?.revenue ?? 0) + rev,
      };

      const key = it.itemId?.toString() ?? it.name;
      if (!itemSales[key]) {
        itemSales[key] = { name: it.name, qty: 0, revenue: 0, instances: [] };
      }
      itemSales[key].qty += it.quantity;
      itemSales[key].revenue += rev;
      itemSales[key].instances.push({
        time: (it.orderedAt ?? o.createdAt).toISOString(),
        qty: it.quantity,
        tableLabel: o.tableLabel,
        kotNumber: o.kotNumber,
        orderId: o._id.toString(),
      });
    }
  }

  // Voids: orders cancelled this day.
  const voids = await Order.countDocuments({
    status: "cancelled",
    updatedAt: { $gte: start, $lte: end },
  });

  const top = Object.entries(topItems)
    .map(([name, v]) => ({ name, qty: v.qty, revenue: Math.round(v.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15);

  // Full catalog, so items with zero sales on this date still show up.
  const catalog = await Item.find().populate("categoryId", "name").lean();
  const seenKeys = new Set<string>();
  const itemWise = catalog.map((item) => {
    const key = item._id.toString();
    seenKeys.add(key);
    const sale = itemSales[key];
    const category =
      (item.categoryId as unknown as { name?: string } | null)?.name ?? "Uncategorized";
    return {
      itemId: key,
      name: item.name,
      category,
      qty: sale?.qty ?? 0,
      revenue: Math.round(sale?.revenue ?? 0),
      instances: (sale?.instances ?? []).sort((a, b) => a.time.localeCompare(b.time)),
    };
  });
  // Sold items whose catalog entry was later removed/renamed still show up.
  for (const [key, sale] of Object.entries(itemSales)) {
    if (seenKeys.has(key)) continue;
    itemWise.push({
      itemId: key,
      name: sale.name,
      category: "Deleted item",
      qty: sale.qty,
      revenue: Math.round(sale.revenue),
      instances: sale.instances.sort((a, b) => a.time.localeCompare(b.time)),
    });
  }
  itemWise.sort((a, b) => b.qty - a.qty || b.revenue - a.revenue || a.name.localeCompare(b.name));

  const captains = Object.entries(byCaptain)
    .map(([name, v]) => ({ name, orders: v.orders, revenue: Math.round(v.revenue) }))
    .sort((a, b) => b.revenue - a.revenue);

  void byCategory;

  return NextResponse.json({
    date: from,
    from,
    to,
    orderCount: settled.length,
    sales: Math.round(sales * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    net: Math.round((sales - tax) * 100) / 100,
    itemsSold,
    ncCount,
    ncValue: Math.round(ncValue),
    voids,
    byPayment: Object.entries(byPayment).map(([method, amount]) => ({
      method,
      amount: Math.round(amount),
    })),
    byHour: Object.entries(byHour)
      .map(([hour, amount]) => ({ hour, amount: Math.round(amount) }))
      .sort((a, b) => a.hour.localeCompare(b.hour)),
    topItems: top,
    itemWise,
    byCaptain: captains,
  });
}
