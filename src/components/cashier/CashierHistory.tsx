"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { History, ArrowLeft } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Pill } from "@/components/ui/Pill";
import { BillPrintButton } from "./TableReceipt";
import type { IOrder } from "@/types";

const getJSON = (u: string) => fetch(u).then((r) => r.json());

export default function CashierHistory({ onExit }: { onExit: () => void }) {
  const { data: orders = [], isLoading } = useQuery<IOrder[]>({
    queryKey: ["cashier-history"],
    queryFn: () => getJSON("/api/orders/cashier/history"),
    refetchInterval: 15000,
  });
  const { data: branding } = useQuery<{
    hotelName?: string;
    gstNumber?: string;
    logoUrl?: string;
  }>({
    queryKey: ["cashier-branding-lite"],
    queryFn: () => getJSON("/api/admin/branding"),
    staleTime: 300_000,
  });

  const total = orders.reduce((s, o) => s + (o.total ?? 0), 0);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-base-300 bg-base-200/50 shrink-0">
        <button onClick={onExit} className="btn btn-ghost btn-sm btn-circle" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <History className="w-5 h-5 text-success" />
          <div>
            <p className="font-bold text-sm leading-none">Today&apos;s Orders</p>
            <p className="text-xs text-base-content/50 leading-none mt-0.5">
              {orders.length} settled · {formatPrice(total)}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-base-200 animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-base-content/40">
            <span className="text-4xl">🧾</span>
            <p className="text-sm">No settled orders today yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-base-300/60">
            {orders.map((o) => (
              <li
                key={o._id}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    <span className="font-mono text-warning">{o.kotNumber}</span>
                    <span className="text-base-content/50"> · {o.tableLabel}</span>
                  </p>
                  <p className="text-xs text-base-content/50">
                    {o.clearedAt || o.paidAt
                      ? format(new Date(o.clearedAt ?? o.paidAt!), "HH:mm")
                      : ""}
                    {o.paymentMethod
                      ? ` · ${o.paymentMethod.replace("_", " ")}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold tabular-nums">
                    {formatPrice(o.total)}
                  </span>
                  <Pill variant="success">{o.status}</Pill>
                  <BillPrintButton
                    data={{ tableLabel: o.tableLabel, kots: [o] }}
                    hotelName={branding?.hotelName}
                    gstNumber={branding?.gstNumber}
                    logoUrl={branding?.logoUrl}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
