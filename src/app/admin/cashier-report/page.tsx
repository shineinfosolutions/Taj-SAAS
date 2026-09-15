"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Landmark, Users } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import {
  CashierReportPrintButton,
  type CashierReportData,
} from "@/components/reports/CashierReportPrint";

const getJSON = (u: string) => fetch(u).then((r) => r.json());

export default function CashierReportPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data } = useQuery<CashierReportData>({
    queryKey: ["cashier-report", date],
    queryFn: () => getJSON(`/api/orders/cashier-report?date=${date}`),
  });

  const { data: branding } = useQuery<{ hotelName?: string; gstNumber?: string }>({
    queryKey: ["cashier-report-branding"],
    queryFn: () => getJSON("/api/admin/branding"),
    staleTime: 300_000,
  });

  const cashiers = data?.cashiers ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cashier-wise Report"
        subtitle="How much each cashier billed and collected, by payment method"
        icon={Landmark}
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Cashier Report" },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-40 bg-white border-slate-300 text-slate-900 rounded-xl font-bold text-xs"
            />
            {data && (
              <CashierReportPrintButton
                data={data}
                hotelName={branding?.hotelName}
                gstNumber={branding?.gstNumber}
              />
            )}
          </div>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-amber-200/60 bg-amber-50/70 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 font-playfair tracking-tight">
                Collections by Cashier
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Settled bills for {date}
              </p>
            </div>
          </div>
          <span className="badge badge-sm bg-white border-amber-300 text-amber-900 font-bold font-mono">
            {cashiers.length} Cashier{cashiers.length !== 1 ? "s" : ""}
          </span>
        </div>

        {cashiers.length === 0 ? (
          <p className="p-8 text-center text-xs font-medium text-slate-400">
            No settled bills recorded for this day.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-5">Cashier</th>
                  <th className="text-right">Orders</th>
                  <th className="text-right">Cash</th>
                  <th className="text-right">Card</th>
                  <th className="text-right">UPI</th>
                  <th className="text-right px-5">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cashiers.map((c) => (
                  <tr key={c.cashierId} className="hover:bg-amber-50/40 transition-colors">
                    <td className="py-3.5 px-5 font-extrabold text-slate-900 text-sm">
                      {c.name}
                    </td>
                    <td className="text-right font-mono font-bold text-slate-800 text-sm">
                      {c.orderCount}
                    </td>
                    <td className="text-right font-mono font-bold text-slate-700 text-sm">
                      {formatPrice(c.cash)}
                    </td>
                    <td className="text-right font-mono font-bold text-slate-700 text-sm">
                      {formatPrice(c.card)}
                    </td>
                    <td className="text-right font-mono font-bold text-slate-700 text-sm">
                      {formatPrice(c.upi)}
                    </td>
                    <td className="text-right font-mono font-black text-emerald-700 text-sm px-5">
                      {formatPrice(c.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-amber-50/50 border-t-2 border-amber-200">
                  <td className="py-3.5 px-5 font-black text-slate-900 text-sm" colSpan={5}>
                    Grand Total
                  </td>
                  <td className="text-right font-mono font-black text-emerald-800 text-base px-5">
                    {formatPrice(data?.grandTotal ?? 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
