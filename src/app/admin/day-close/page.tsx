"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, Lock, Unlock, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DayCloseForm from "@/components/reports/DayCloseForm";
import { formatPrice } from "@/lib/utils";
import { businessDayLabel } from "@/lib/business-day";
import { exportXlsx } from "@/lib/inventory/sheet";

interface HistoryDay {
  businessDate: string;
  status: "closed" | "overridden" | "auto_no_sales";
  bills: number;
  total: number;
  byMethod: Record<string, number>;
  cashExpected: number;
  cashCounted?: number;
  cashDiff?: number;
  cardReported?: number;
  upiReported?: number;
  remark?: string;
  overrideReason?: string;
  pinApproved?: boolean;
  closedByName?: string;
  closedByRole?: string;
  closedAt: string;
  afterClose: { kot: string; table: string; reopenedAt: string; reason?: string; refund?: number }[];
}

interface History {
  currentBusinessDate: string;
  firstAuditDate: string;
  enforced: boolean;
  lockEnabled: boolean;
  pending: string[];
  days: HistoryDay[];
}

const STATUS_LABEL: Record<HistoryDay["status"], { label: string; cls: string }> = {
  closed: { label: "Audited", cls: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  overridden: { label: "Override", cls: "bg-amber-50 text-amber-800 border-amber-300" },
  auto_no_sales: { label: "No sales", cls: "bg-slate-50 text-slate-500 border-slate-200" },
};

const PIN_THRESHOLD = 500;

export default function DayClosePage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery<History>({
    queryKey: ["day-close-history"],
    queryFn: async () => {
      const r = await fetch("/api/day-close/history", { cache: "no-store" });
      if (!r.ok) throw new Error("history failed");
      return r.json();
    },
  });

  const [auditing, setAuditing] = useState<string | null>(null);
  const [overrideFor, setOverrideFor] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["day-close-history"] });
    qc.invalidateQueries({ queryKey: ["day-close-status"] });
  };

  const toggleLock = async () => {
    if (!data) return;
    const next = !data.lockEnabled;
    if (
      !next &&
      !window.confirm(
        "Turning the lock off allows billing without the day-close audit. Use only in an emergency. Turn it off?",
      )
    )
      return;
    setBusy(true);
    try {
      const r = await fetch("/api/day-close/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lockEnabled: next }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Update failed");
      toast.success(next ? "Audit lock ON" : "Audit lock OFF — billing allowed without the audit");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitOverride = async () => {
    if (!overrideFor) return;
    if (!overrideReason.trim()) {
      toast.error("Enter a reason for the override");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/day-close/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessDate: overrideFor, reason: overrideReason.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Override failed");
      toast.success(`${overrideFor} overridden`);
      setOverrideFor(null);
      setOverrideReason("");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const exportHistory = () => {
    if (!data) return;
    exportXlsx(
      data.days.map((d) => ({
        "Business day": d.businessDate,
        Status: STATUS_LABEL[d.status].label,
        Bills: d.bills,
        "Total sales": d.total,
        Cash: d.byMethod.cash ?? 0,
        Card: d.byMethod.card ?? 0,
        UPI: d.byMethod.upi ?? 0,
        "Cash counted": d.cashCounted ?? "",
        "Cash difference": d.cashDiff ?? "",
        "Card reported": d.cardReported ?? "",
        "UPI reported": d.upiReported ?? "",
        Remark: d.remark ?? d.overrideReason ?? "",
        "Closed by": d.closedByName ?? "",
        "Closed at": new Date(d.closedAt).toLocaleString("en-IN"),
        "After-close changes": d.afterClose.length,
      })),
      `day-close-audit.xlsx`,
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Day Close Audit"
        subtitle="Audit every business day (6 AM → 6 AM next day) — billing for the next day starts after the audit"
        icon={ShieldCheck}
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Day Close Audit" },
        ]}
      />

      {isError && (
        <div className="alert alert-error text-sm">Could not load audit data. Refresh the page.</div>
      )}
      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

      {data && (
        <>
          {/* Lock switch */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-black text-slate-900 flex items-center gap-2">
                {data.lockEnabled ? (
                  <Lock className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Unlock className="w-4 h-4 text-rose-600" />
                )}
                Billing lock: {data.lockEnabled ? "ON" : "OFF"}
              </p>
              <p className="text-xs text-slate-500">
                {data.enforced
                  ? "Payments and bills are blocked while the previous day's audit is pending. Orders and KOTs are never blocked."
                  : `Rule applies from the ${data.firstAuditDate} business day — the first popup appears at 6 AM the next morning.`}
                {" "}Current business day: {businessDayLabel(data.currentBusinessDate)}.
              </p>
            </div>
            <button
              onClick={toggleLock}
              disabled={busy}
              className={`btn btn-sm font-bold ${data.lockEnabled ? "btn-outline btn-error" : "btn-success text-white"}`}
            >
              {data.lockEnabled ? "Turn lock OFF (emergency)" : "Turn lock ON"}
            </button>
          </div>

          {/* Pending audits */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <p className="font-black text-slate-900">
              Pending audits ({data.pending.length})
            </p>
            {data.pending.length === 0 ? (
              <p className="text-sm text-emerald-700 font-semibold">No audits pending ✓</p>
            ) : (
              data.pending.map((d, i) => (
                <div key={d} className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> {businessDayLabel(d)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-xs btn-success text-white"
                        disabled={i !== 0}
                        title={i !== 0 ? "Audit the older day first" : undefined}
                        onClick={() => setAuditing(auditing === d ? null : d)}
                      >
                        Do Audit
                      </button>
                      <button
                        className="btn btn-xs btn-outline btn-warning"
                        onClick={() => setOverrideFor(overrideFor === d ? null : d)}
                      >
                        Override (emergency)
                      </button>
                    </div>
                  </div>
                  {overrideFor === d && (
                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Reason for override (required)"
                        className="input input-sm input-bordered flex-1 min-w-[220px]"
                      />
                      <button className="btn btn-sm btn-warning" disabled={busy} onClick={submitOverride}>
                        Save override
                      </button>
                    </div>
                  )}
                  {auditing === d && (
                    <DayCloseForm
                      key={d}
                      businessDate={d}
                      pinThreshold={PIN_THRESHOLD}
                      onDone={() => {
                        setAuditing(null);
                        refresh();
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* History */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <p className="font-black text-slate-900">Audit history</p>
              <button className="btn btn-xs btn-outline" onClick={exportHistory} disabled={!data.days.length}>
                Excel export
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr className="text-xs text-slate-500">
                    <th>Business day</th>
                    <th>Status</th>
                    <th className="text-right">Bills</th>
                    <th className="text-right">Sales</th>
                    <th className="text-right">Cash (system)</th>
                    <th className="text-right">Cash (counted)</th>
                    <th className="text-right">Difference</th>
                    <th>Remark</th>
                    <th>Closed by / at</th>
                    <th>After-close</th>
                  </tr>
                </thead>
                <tbody>
                  {data.days.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center text-sm text-slate-400 py-8">
                        No audits yet.
                      </td>
                    </tr>
                  )}
                  {data.days.map((d) => (
                    <tr key={d.businessDate} className="align-top">
                      <td className="font-mono font-bold text-xs whitespace-nowrap">{d.businessDate}</td>
                      <td>
                        <span className={`inline-flex px-2 py-0.5 rounded-md border text-[11px] font-bold ${STATUS_LABEL[d.status].cls}`}>
                          {STATUS_LABEL[d.status].label}
                        </span>
                      </td>
                      <td className="text-right font-mono text-xs">{d.bills}</td>
                      <td className="text-right font-mono text-xs">{formatPrice(d.total)}</td>
                      <td className="text-right font-mono text-xs">{formatPrice(d.cashExpected)}</td>
                      <td className="text-right font-mono text-xs">
                        {d.cashCounted === undefined ? "—" : formatPrice(d.cashCounted)}
                      </td>
                      <td
                        className={`text-right font-mono text-xs font-bold ${
                          d.cashDiff === undefined || d.cashDiff === 0 ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {d.cashDiff === undefined ? "—" : d.cashDiff === 0 ? "✓" : formatPrice(d.cashDiff)}
                        {d.pinApproved && <span className="block text-[10px] text-slate-500">PIN approved</span>}
                      </td>
                      <td className="text-xs max-w-[220px]">{d.remark || d.overrideReason || "—"}</td>
                      <td className="text-xs whitespace-nowrap">
                        {d.closedByName ?? "—"}
                        <span className="block text-[10px] text-slate-500">
                          {new Date(d.closedAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      </td>
                      <td className="text-xs">
                        {d.afterClose.length === 0 ? (
                          "—"
                        ) : (
                          <span className="text-rose-700 font-bold" title={d.afterClose.map((a) => `${a.kot} ${a.table}: ${a.reason ?? ""}`).join("\n")}>
                            {d.afterClose.length} changes
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
