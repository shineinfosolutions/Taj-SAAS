import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Location from "@/lib/db/models/Location";
import type { ILocation } from "@/types";

// GET /api/locations — returns active tables/rooms for menu and staff
export async function GET(req: NextRequest) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = { isActive: true };
  if (type === "table" || type === "room") query.type = type;

  const locations = await Location.find(query)
    .sort({ type: 1 })
    .lean<ILocation[]>();

  const getSortKey = (loc: ILocation) => {
    const label = (loc.label || "").trim();
    // Check if label starts with "Table", "T", or is a pure number (e.g. "5", "Table 1", "T-3")
    const match = label.match(/^(?:Table\s*|T\s*-?\s*)?(\d+)$/i);
    if (match) {
      return { isTableNumber: true, num: parseInt(match[1], 10), text: label };
    }
    // Has number at the end e.g. "VIP 2", "Cabin 1"
    const generalNumMatch = label.match(/^([A-Za-z\s]+?)\s*(\d+)$/);
    if (generalNumMatch) {
      return {
        isTableNumber: false,
        num: parseInt(generalNumMatch[2], 10),
        text: generalNumMatch[1].trim(),
      };
    }
    return { isTableNumber: false, num: Infinity, text: label };
  };

  locations.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    const keyA = getSortKey(a);
    const keyB = getSortKey(b);

    // Numbered tables come first in exact ascending order: 1, 2, 3, 4, 5, 11...
    if (keyA.isTableNumber && keyB.isTableNumber) {
      return keyA.num - keyB.num;
    }
    if (keyA.isTableNumber) return -1;
    if (keyB.isTableNumber) return 1;

    // Next, other named sections alphabetically + numerically
    if (keyA.text.toLowerCase() !== keyB.text.toLowerCase()) {
      return keyA.text.localeCompare(keyB.text, undefined, { numeric: true });
    }
    return keyA.num - keyB.num;
  });

  return NextResponse.json(locations);
}
