"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Landmark } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import {
  CashierReportPrintButton,
  type CashierReportData,
} from "@/components/reports/CashierReportPrint";

import { currentBusinessDate } from "@/lib/business-day";

const getJSON = (u: string) => fetch(u).then((r) => r.json());

export default function CashierMyReport({ onExit }: { onExit: () => void }) {
  const [date, setDate] = useState(() => currentBusinessDate());

  const { data, isLoading } = useQuery<CashierReportData>({
    queryKey: ["cashier-my-report", date],
    queryFn: () => getJSON(`/api/orders/cashier-report?date=${date}`),
  });

  const { data: branding } = useQuery<{ hotelName?: string; gstNumber?: string }>({
    queryKey: ["cashier-branding-lite"],
    queryFn: () => getJSON("/api/admin/branding"),
    staleTime: 300_000,
  });

  // The API already restricts a cashier session to their own numbers, so
  // there's at most one row here.
  const mine = data?.cashiers?.[0];

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-base-300 bg-base-200/50 shrink-0">
        <button
          onClick={onExit}
          className="btn btn-ghost btn-sm btn-circle"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Landmark className="w-5 h-5 text-success" />
          <div>
            <p className="font-bold text-sm leading-none">My Billing Report</p>
            <p className="text-xs text-base-content/50 leading-none mt-0.5">
              What you&apos;ve collected today
            </p>
          </div>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input input-sm input-bordered w-36 text-xs"
        />
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="h-24 rounded-lg bg-base-200 animate-pulse" />
        ) : !mine ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-base-content/40">
            <span className="text-4xl">🧾</span>
            <p className="text-sm">No settled bills on {date} yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="stat bg-base-200/50 rounded-2xl p-3.5">
                <div className="stat-title text-xs">Orders Billed</div>
                <div className="stat-value text-2xl font-mono">{mine.orderCount}</div>
              </div>
              <div className="stat bg-base-200/50 rounded-2xl p-3.5">
                <div className="stat-title text-xs">Cash</div>
                <div className="stat-value text-xl font-mono">{formatPrice(mine.cash)}</div>
              </div>
              <div className="stat bg-base-200/50 rounded-2xl p-3.5">
                <div className="stat-title text-xs">Card</div>
                <div className="stat-value text-xl font-mono">{formatPrice(mine.card)}</div>
              </div>
              <div className="stat bg-base-200/50 rounded-2xl p-3.5">
                <div className="stat-title text-xs">UPI</div>
                <div className="stat-value text-xl font-mono">{formatPrice(mine.upi)}</div>
              </div>
            </div>

            <div className="bg-success/10 border border-success/20 rounded-2xl p-4 flex items-center justify-between">
              <span className="font-bold text-sm">Total Collected</span>
              <span className="font-mono font-black text-2xl text-success">
                {formatPrice(mine.total)}
              </span>
            </div>

            {data && (
              <CashierReportPrintButton
                data={data}
                hotelName={branding?.hotelName}
                gstNumber={branding?.gstNumber}
                label="Print / Save PDF"
                className="btn btn-success w-full gap-1.5"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
