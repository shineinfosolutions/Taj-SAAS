"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  IndianRupee,
  Receipt,
  Gift,
  Ban,
  Download,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import { exportXlsx } from "@/lib/inventory/sheet";

interface DayEnd {
  date: string;
  orderCount: number;
  sales: number;
  tax: number;
  net: number;
  itemsSold: number;
  ncCount: number;
  ncValue: number;
  voids: number;
  byPayment: { method: string; amount: number }[];
  byHour: { hour: string; amount: number }[];
  topItems: { name: string; qty: number; revenue: number }[];
}

const getJSON = (u: string) => fetch(u).then((r) => r.json());

export default function DayEndPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const { data } = useQuery<DayEnd>({
    queryKey: ["dayend", date],
    queryFn: () => getJSON(`/api/orders/dayend?date=${date}`),
  });

  const cards = [
    { label: "Sales", value: data ? formatPrice(data.sales) : "—", icon: IndianRupee, tone: "text-success" },
    { label: "Orders", value: data?.orderCount ?? "—", icon: Receipt, tone: "text-primary" },
    { label: "Tax collected", value: data ? formatPrice(data.tax) : "—", icon: IndianRupee, tone: "text-info" },
    { label: "Items sold", value: data?.itemsSold ?? "—", icon: Receipt, tone: "text-base-content" },
    { label: "No-Charge", value: data ? `${data.ncCount} · ${formatPrice(data.ncValue)}` : "—", icon: Gift, tone: "text-warning" },
    { label: "Voids", value: data?.voids ?? "—", icon: Ban, tone: "text-error" },
  ];

  return (
    <div>
      <PageHeader
        title="Day-end Report"
        subtitle="Sales summary, payments, and top items for a day"
        icon={CalendarDays}
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Day-end" },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-40"
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={!data}
              onClick={() =>
                data &&
                exportXlsx(
                  [
                    { metric: "Date", value: data.date },
                    { metric: "Sales", value: data.sales },
                    { metric: "Net", value: data.net },
                    { metric: "Tax", value: data.tax },
                    { metric: "Orders", value: data.orderCount },
                    { metric: "Items sold", value: data.itemsSold },
                    { metric: "NC count", value: data.ncCount },
                    { metric: "NC value", value: data.ncValue },
                    { metric: "Voids", value: data.voids },
                    ...data.byPayment.map((p) => ({
                      metric: `Payment: ${p.method}`,
                      value: p.amount,
                    })),
                    ...data.topItems.map((t) => ({
                      metric: `Item: ${t.name} (x${t.qty})`,
                      value: t.revenue,
                    })),
                  ],
                  `dayend-${data.date}.xlsx`,
                )
              }
            >
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl bg-base-200 border border-base-300/60 p-4"
          >
            <c.icon className={`w-5 h-5 ${c.tone} mb-2`} />
            <p className="text-2xl font-bold tabular-nums">{c.value}</p>
            <p className="text-xs text-base-content/50">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Payments">
          {(data?.byPayment ?? []).length === 0 ? (
            <Empty />
          ) : (
            <ul className="divide-y divide-base-300/50">
              {data?.byPayment.map((p) => (
                <li key={p.method} className="flex justify-between px-4 py-2.5 text-sm">
                  <span className="capitalize">{p.method.replace("_", " ")}</span>
                  <span className="font-medium tabular-nums">
                    {formatPrice(p.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Top items">
          {(data?.topItems ?? []).length === 0 ? (
            <Empty />
          ) : (
            <ul className="divide-y divide-base-300/50">
              {data?.topItems.map((t) => (
                <li key={t.name} className="flex justify-between px-4 py-2.5 text-sm">
                  <span>
                    {t.name}{" "}
                    <span className="text-base-content/40">×{t.qty}</span>
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatPrice(t.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-base-200 border border-base-300/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-base-300/60 font-semibold text-sm">
        {title}
      </div>
      {children}
    </div>
  );
}
function Empty() {
  return (
    <p className="p-6 text-center text-sm text-base-content/40">
      No sales for this day.
    </p>
  );
}
