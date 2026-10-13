"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarCheck } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface InvoiceSummary {
  date: string;
  bills: number;
  kots: number;
  total: number;
  tax: number;
  discount: number;
  byMethod: Record<string, number>;
}

const METHODS: { key: string; label: string }[] = [
  { key: "cash", label: "Cash" },
  { key: "card", label: "Card" },
  { key: "upi", label: "UPI" },
];

/** Today's settled invoices — count + amount. Always today, whatever the page filter. */
export default function TodayInvoiceSummary() {
  const { data, isLoading } = useQuery<InvoiceSummary>({
    queryKey: ["invoice-summary-today"],
    queryFn: () => fetch("/api/orders/invoice-summary").then((r) => r.json()),
    refetchInterval: 30_000,
  });

  return (
    <div className="rounded-2xl bg-gradient-to-r from-amber-50 via-white to-emerald-50/60 border border-amber-300/80 px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
          <CalendarCheck className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
            Today&apos;s Invoices
          </p>
          <p className="text-xs text-slate-500 font-medium">
            {isLoading || !data
              ? "Loading…"
              : `${data.bills} bill${data.bills === 1 ? "" : "s"} · ${data.kots} KOT${data.kots === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-mono">
        {METHODS.map((m) => (
          <div key={m.key}>
            <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider font-sans">
              {m.label}
            </span>
            <span className="font-bold text-slate-800">
              {data ? formatPrice(data.byMethod?.[m.key] ?? 0) : "—"}
            </span>
          </div>
        ))}
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider font-sans">
            Total Today
          </span>
          <span className="inline-block px-2.5 py-0.5 rounded-lg bg-emerald-100 border border-emerald-300 font-black text-base text-emerald-800 shadow-sm">
            {data ? formatPrice(data.total ?? 0) : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
