"use client";

import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  Search,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { addDays, currentBusinessDate } from "@/lib/business-day";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";

export interface ItemSaleInstance {
  time: string;
  qty: number;
  tableLabel: string;
  kotNumber: string;
  orderId: string;
}

export interface ItemWise {
  itemId: string;
  name: string;
  category: string;
  qty: number;
  revenue: number;
  instances: ItemSaleInstance[];
}

const getJSON = (u: string) => fetch(u).then((r) => r.json());

type Preset = "day" | "yesterday" | "7days" | "month" | "custom";

// "day" = the date picked on the Day-end page.
const PRESETS: { key: Exclude<Preset, "custom">; label: string }[] = [
  { key: "day", label: "Selected Day" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7days", label: "Last 7 Days" },
  { key: "month", label: "This Month" },
];

export default function ItemWiseReportModal({
  defaultDate,
}: {
  defaultDate: string;
}) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(defaultDate);
  const [to, setTo] = useState(defaultDate);
  const [preset, setPreset] = useState<Preset>("day");
  const [query, setQuery] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // An inverted range is tolerated — the API swaps it — but keep the key stable.
  const [rangeFrom, rangeTo] = from <= to ? [from, to] : [to, from];
  const isRange = rangeFrom !== rangeTo;

  const { data, isLoading } = useQuery<{ itemWise: ItemWise[] }>({
    queryKey: ["dayend-itemwise", rangeFrom, rangeTo],
    queryFn: () =>
      getJSON(`/api/orders/dayend?from=${rangeFrom}&to=${rangeTo}`),
    enabled: open && !!rangeFrom && !!rangeTo,
  });

  const applyPreset = (p: Preset) => {
    setPreset(p);
    // Business days (6 AM → 6 AM), so 2 AM sales stay with the evening before.
    const today = currentBusinessDate();
    if (p === "day") {
      setFrom(defaultDate);
      setTo(defaultDate);
    } else if (p === "yesterday") {
      const y = addDays(today, -1);
      setFrom(y);
      setTo(y);
    } else if (p === "7days") {
      setFrom(addDays(today, -6));
      setTo(today);
    } else if (p === "month") {
      setFrom(`${today.slice(0, 8)}01`);
      setTo(today);
    }
  };

  const filtered = useMemo(() => {
    const list = data?.itemWise ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (it) =>
        it.name.toLowerCase().includes(q) || it.category.toLowerCase().includes(q),
    );
  }, [data?.itemWise, query]);

  const totalQty = filtered.reduce((s, it) => s + it.qty, 0);
  const totalRevenue = filtered.reduce((s, it) => s + it.revenue, 0);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setFrom(defaultDate);
          setTo(defaultDate);
          setPreset("day");
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 bg-white border-slate-300 text-slate-700 font-bold rounded-xl shadow-xs"
          />
        }
      >
        <ClipboardList className="w-4 h-4" /> Item-wise Report
      </DialogTrigger>

      <DialogContent className="sm:max-w-4xl w-full max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 shrink-0">
              <ClipboardList className="w-3.5 h-3.5 text-amber-700" />
            </span>
            Item-wise Report
          </DialogTitle>
        </DialogHeader>

        {/* Date filter: quick presets or a custom from → to range */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" /> Filter
          </span>
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => applyPreset(p.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-150 ${
                preset === p.key
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/20 font-bold"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <CalendarDays className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-600 text-[11px] font-semibold">From:</span>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset("custom");
              }}
              className="bg-transparent text-slate-800 text-xs outline-none cursor-pointer font-medium"
            />
            <span className="text-slate-400 text-[11px] px-1">→</span>
            <span className="text-slate-600 text-[11px] font-semibold">To:</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset("custom");
              }}
              className="bg-transparent text-slate-800 text-xs outline-none cursor-pointer font-medium"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-1">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search item or category… (blank = all items)"
              className="w-full pl-8 bg-white border-slate-300 text-slate-900 rounded-xl font-bold text-xs"
            />
          </div>
          <span className="badge badge-sm bg-amber-50 border-amber-300 text-amber-900 font-bold font-mono shrink-0">
            {filtered.length} Items
          </span>
          <span className="badge badge-sm bg-emerald-50 border-emerald-300 text-emerald-900 font-bold font-mono shrink-0">
            Qty {totalQty} · {formatPrice(totalRevenue)}
          </span>
        </div>

        {isLoading ? (
          <p className="p-8 text-center text-xs font-medium text-slate-400">
            Loading…
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-xs font-medium text-slate-400">
            No items match this filter.
          </p>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto max-h-[55vh] overflow-y-auto">
              <table className="table table-sm w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-5 w-8"></th>
                    <th>Item</th>
                    <th>Category</th>
                    <th className="text-right">Qty Sold</th>
                    <th className="text-right px-5">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((it) => {
                    const isExpanded = expandedItems.has(it.itemId);
                    const hasSales = it.instances.length > 0;
                    return (
                      <Fragment key={it.itemId}>
                        <tr
                          onClick={() => hasSales && toggleExpanded(it.itemId)}
                          className={`transition-colors ${
                            hasSales
                              ? "cursor-pointer hover:bg-amber-50/40"
                              : "text-slate-400"
                          }`}
                        >
                          <td className="px-5">
                            {hasSales &&
                              (isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                              ))}
                          </td>
                          <td className="font-extrabold text-sm text-slate-900">
                            {it.name}
                          </td>
                          <td className="text-xs font-bold text-slate-500">
                            {it.category}
                          </td>
                          <td className="text-right font-mono font-bold text-slate-800 text-sm">
                            {it.qty}
                          </td>
                          <td className="text-right font-mono font-black text-slate-900 text-sm px-5">
                            {formatPrice(it.revenue)}
                          </td>
                        </tr>
                        {isExpanded && hasSales && (
                          <tr key={`${it.itemId}-detail`}>
                            <td></td>
                            <td colSpan={4} className="pb-3 pt-0 px-5">
                              <div className="rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden">
                                <table className="table table-xs w-full">
                                  <thead>
                                    <tr className="text-[10px] uppercase text-slate-400 font-bold">
                                      <th className="py-2 px-3">
                                        {isRange ? "Date & Time" : "Time"}
                                      </th>
                                      <th>Table</th>
                                      <th>KOT</th>
                                      <th className="text-right px-3">Qty</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                    {it.instances.map((inst, i) => (
                                      <tr key={`${inst.orderId}-${i}`}>
                                        <td className="py-1.5 px-3 font-mono font-bold text-slate-700">
                                          {isRange &&
                                            `${format(new Date(inst.time), "dd MMM")}, `}
                                          {new Date(inst.time).toLocaleTimeString("en-IN", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: true,
                                          })}
                                        </td>
                                        <td className="font-bold text-slate-600">
                                          {inst.tableLabel}
                                        </td>
                                        <td className="font-mono text-slate-500">
                                          {inst.kotNumber}
                                        </td>
                                        <td className="text-right px-3 font-mono font-bold text-slate-700">
                                          ×{inst.qty}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
