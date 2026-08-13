"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Filter } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { IOrder } from "@/types";
import { BillPrintButton } from "@/components/cashier/TableReceipt";

interface BrandingLite {
  hotelName?: string;
  gstNumber?: string;
  logoUrl?: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "💵 Cash",
  card: "💳 Card",
  upi: "📱 UPI",
};

interface Filters {
  from: string;
  to: string;
  query: string;
}

// Settled orders only (paid/cleared) — these are the billable invoices.
async function fetchInvoices(f: Filters): Promise<IOrder[]> {
  const p = new URLSearchParams();
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to + "T23:59:59");
  const res = await fetch(`/api/orders?${p.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch invoices");
  const all: IOrder[] = await res.json();
  return all.filter((o) => ["paid", "cleared"].includes(o.status));
}

export default function InvoicesTable() {
  const [filters, setFilters] = useState<Filters>(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    return { from: today, to: today, query: "" };
  });

  const { data: branding } = useQuery<BrandingLite>({
    queryKey: ["admin-branding-lite"],
    queryFn: () => fetch("/api/admin/branding").then((r) => r.json()),
    staleTime: 300_000,
  });

  const {
    data: invoices = [],
    isLoading,
    isError,
  } = useQuery<IOrder[]>({
    queryKey: ["admin-invoices", filters.from, filters.to],
    queryFn: () => fetchInvoices(filters),
  });

  const set = useCallback((key: keyof Filters, value: string) => {
    setFilters((p) => ({ ...p, [key]: value }));
  }, []);

  const q = filters.query.toLowerCase().trim();
  const filtered = invoices.filter(
    (o) =>
      !q ||
      o.kotNumber.toLowerCase().includes(q) ||
      o.tableLabel.toLowerCase().includes(q),
  );

  const revenue = filtered.reduce((s, o) => s + o.total, 0);
  const taxTotal = filtered.reduce((s, o) => s + (o.tax ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="card bg-base-200 border border-base-300 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2 text-sm font-medium text-base-content/60 mb-0.5">
            <Filter className="w-4 h-4" /> Filters
          </div>
          <div className="form-control gap-0.5">
            <label className="label-text text-xs text-base-content/50">From</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => set("from", e.target.value)}
              className="input input-sm input-bordered w-36"
            />
          </div>
          <div className="form-control gap-0.5">
            <label className="label-text text-xs text-base-content/50">To</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => set("to", e.target.value)}
              className="input input-sm input-bordered w-36"
            />
          </div>
          <div className="form-control gap-0.5">
            <label className="label-text text-xs text-base-content/50">
              Search
            </label>
            <input
              type="text"
              value={filters.query}
              placeholder="KOT or table…"
              onChange={(e) => set("query", e.target.value)}
              className="input input-sm input-bordered w-40"
            />
          </div>
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-4 text-sm text-base-content/60 px-1">
        <span>
          <span className="font-bold text-base-content">{filtered.length}</span>{" "}
          invoices
        </span>
        <span>·</span>
        <span>
          Revenue:{" "}
          <span className="font-bold text-success">{formatPrice(revenue)}</span>
        </span>
        {taxTotal > 0 && (
          <>
            <span>·</span>
            <span>
              GST: <span className="font-bold">{formatPrice(taxTotal)}</span>
            </span>
          </>
        )}
        {isLoading && (
          <span className="loading loading-spinner loading-xs ml-2" />
        )}
      </div>

      {isError && (
        <div className="alert alert-error text-sm">Failed to load invoices.</div>
      )}

      <div className="card bg-base-200 border border-base-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs text-base-content/40 border-b border-base-300">
                <th>KOT</th>
                <th>Table</th>
                <th>Items</th>
                <th className="text-right">Subtotal</th>
                <th className="text-right">GST</th>
                <th className="text-right">Total</th>
                <th>Payment</th>
                <th>Date</th>
                <th className="text-right">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-10 text-base-content/30 text-sm"
                  >
                    No settled invoices in this range.
                  </td>
                </tr>
              )}
              {filtered.map((o) => (
                <tr key={o._id} className="border-b border-base-300/50 hover">
                  <td className="font-mono text-xs font-bold">{o.kotNumber}</td>
                  <td className="text-sm">{o.tableLabel}</td>
                  <td className="text-sm text-base-content/60">
                    {o.items.filter((i) => i.itemStatus !== "cancelled").length}
                  </td>
                  <td className="text-right text-sm tabular-nums">
                    {formatPrice(o.subtotal)}
                  </td>
                  <td className="text-right text-sm tabular-nums text-base-content/60">
                    {o.tax ? formatPrice(o.tax) : "—"}
                  </td>
                  <td className="text-right font-semibold text-sm tabular-nums">
                    {formatPrice(o.total)}
                  </td>
                  <td className="text-xs text-base-content/50">
                    {o.paymentMethod ? PAYMENT_LABELS[o.paymentMethod] : "—"}
                  </td>
                  <td className="text-xs text-base-content/40">
                    {format(new Date(o.paidAt ?? o.createdAt), "dd MMM, HH:mm")}
                  </td>
                  <td className="text-right">
                    <BillPrintButton
                      data={{ tableLabel: o.tableLabel, kots: [o] }}
                      hotelName={branding?.hotelName}
                      gstNumber={branding?.gstNumber}
                      logoUrl={branding?.logoUrl}
                      label="Invoice"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
