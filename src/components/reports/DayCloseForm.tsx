"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { CheckCircle2, Printer, ShieldCheck } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { businessDayLabel } from "@/lib/business-day";
import type { DaySummary } from "@/lib/day-close";

const round2 = (n: number) => Math.round(n * 100) / 100;

const timeFmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

interface Props {
  businessDate: string;
  pinThreshold: number;
  onDone: () => void;
}

/**
 * Day-close audit for one business day: shows the system totals, takes the
 * counted cash (and optional card / UPI totals), and submits. Totals are
 * recomputed on the server — the numbers here are only for display.
 */
export default function DayCloseForm({ businessDate, pinThreshold, onDone }: Props) {
  const {
    data: s,
    isLoading,
    isError,
    refetch,
  } = useQuery<DaySummary>({
    queryKey: ["day-close-summary", businessDate],
    queryFn: async () => {
      const r = await fetch(`/api/day-close/summary?date=${businessDate}`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error("summary failed");
      return r.json();
    },
  });

  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [upi, setUpi] = useState("");
  const [remark, setRemark] = useState("");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [closedAt, setClosedAt] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Day-Close-${businessDate}`,
    pageStyle: `@page { size: 80mm auto; margin: 0; } @media print { body { margin: 0; } }`,
  });

  const cashNum = cash.trim() === "" ? null : Number(cash);
  const cashDiff = s && cashNum !== null && Number.isFinite(cashNum)
    ? round2(cashNum - s.cashExpected)
    : null;
  const diffOf = (v: string, expected: number) =>
    v.trim() === "" || !Number.isFinite(Number(v)) ? null : round2(Number(v) - expected);
  const cardDiff = s ? diffOf(card, s.byMethod.card ?? 0) : null;
  const upiDiff = s ? diffOf(upi, s.byMethod.upi ?? 0) : null;
  const needsPin = cashDiff !== null && Math.abs(cashDiff) > pinThreshold;

  const submit = async () => {
    if (cashNum === null || !Number.isFinite(cashNum) || cashNum < 0) {
      toast.error("Drawer mein gina hua cash bharein");
      return;
    }
    if (cashDiff !== 0 && !remark.trim()) {
      toast.error("Cash mein fark hai — remark likhein");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/day-close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessDate,
          cashCounted: cashNum,
          cardReported: card.trim() === "" ? undefined : Number(card),
          upiReported: upi.trim() === "" ? undefined : Number(upi),
          remark: remark.trim() || undefined,
          managerPin: pin.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Audit save nahi hua");
      toast.success(`${businessDate} ka audit ho gaya — billing chalu`);
      setClosedAt(data.record?.closedAt ?? new Date().toISOString());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <p className="p-6 text-center text-sm text-slate-500">Hisaab load ho raha hai…</p>;
  }
  if (isError || !s) {
    return (
      <div className="p-6 text-center space-y-2">
        <p className="text-sm text-rose-700 font-semibold">Hisaab load nahi hua.</p>
        <button className="btn btn-sm" onClick={() => refetch()}>
          Dobara try karein
        </button>
      </div>
    );
  }

  const row = (label: string, value: React.ReactNode, strong = false) => (
    <div className={`flex justify-between gap-3 ${strong ? "font-black text-slate-900" : "text-slate-700"}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );

  const diffText = (d: number | null) =>
    d === null ? "—" : d === 0 ? "✓ Match" : d > 0 ? `+${formatPrice(d)} excess` : `${formatPrice(d)} short`;
  const diffCls = (d: number | null) =>
    d === null ? "text-slate-400" : d === 0 ? "text-emerald-700" : "text-rose-700";

  // Printable Z-report (browser print — works with any printer on this PC).
  const zReport = (
    <div
      ref={printRef}
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: 12,
        lineHeight: 1.4,
        padding: "6mm",
        maxWidth: "80mm",
        color: "#000",
        background: "#fff",
      }}
    >
      <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 14 }}>DAY CLOSE (Z) REPORT</div>
      <div style={{ textAlign: "center", fontSize: 11 }}>Business day {businessDayLabel(businessDate)}</div>
      <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />
      {[
        ["Bills", String(s.bills)],
        ["KOTs", String(s.kots)],
        ["First bill", timeFmt(s.firstBillAt)],
        ["Last bill", timeFmt(s.lastBillAt)],
        ["Subtotal", `₹${s.subtotal.toFixed(2)}`],
        ["Discount", `₹${s.discount.toFixed(2)}`],
        ["GST", `₹${s.tax.toFixed(2)}`],
        ["Round off", `₹${s.roundOff.toFixed(2)}`],
        ["TOTAL SALES", `₹${s.total.toFixed(2)}`],
        ["Cash", `₹${(s.byMethod.cash ?? 0).toFixed(2)}`],
        ["Card", `₹${(s.byMethod.card ?? 0).toFixed(2)}`],
        ["UPI", `₹${(s.byMethod.upi ?? 0).toFixed(2)}`],
        ["Cash counted", cashNum === null ? "—" : `₹${cashNum.toFixed(2)}`],
        ["Cash difference", cashDiff === null ? "—" : `₹${cashDiff.toFixed(2)}`],
        ["NC items", `${s.nc.count} (₹${s.nc.value.toFixed(2)})`],
        ["Cancelled KOTs", String(s.cancelled.length)],
        ["Reopened bills", String(s.reopened.length)],
        ["Open tables", `${s.openTables.count} (₹${s.openTables.total.toFixed(2)})`],
      ].map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{k}</span>
          <span>{v}</span>
        </div>
      ))}
      {remark.trim() && <div style={{ marginTop: 4 }}>Remark: {remark.trim()}</div>}
      <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />
      <div style={{ fontSize: 10 }}>Closed: {timeFmt(closedAt)}</div>
    </div>
  );

  if (closedAt) {
    return (
      <div className="p-5 text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
        <div>
          <p className="font-black text-slate-900">Audit complete</p>
          <p className="text-xs text-slate-500">Business day {businessDayLabel(businessDate)}</p>
        </div>
        <div className="flex gap-2 justify-center">
          <button className="btn btn-sm gap-1.5" onClick={() => handlePrint()}>
            <Printer className="w-4 h-4" /> Print Z-Report
          </button>
          <button className="btn btn-sm btn-success text-white" onClick={onDone}>
            Billing shuru karein
          </button>
        </div>
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>{zReport}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-xl bg-amber-50 border border-amber-300 px-3 py-2">
        <p className="font-black text-amber-900">Business day {businessDayLabel(businessDate)}</p>
        <p className="text-xs text-amber-800">
          {s.bills} bills · {s.kots} KOTs · pehla bill {timeFmt(s.firstBillAt)} · aakhri bill{" "}
          {timeFmt(s.lastBillAt)}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 p-3 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Sales</p>
          {row("Subtotal", formatPrice(s.subtotal))}
          {row("Discount", s.discount ? `− ${formatPrice(s.discount)}` : "—")}
          {row("GST", formatPrice(s.tax))}
          {row("Round off", `₹${s.roundOff.toFixed(2)}`)}
          {row("Total sales", formatPrice(s.total), true)}
        </div>
        <div className="rounded-xl border border-slate-200 p-3 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Payments (system)</p>
          {row("Cash", formatPrice(s.byMethod.cash ?? 0), true)}
          {row("Card", formatPrice(s.byMethod.card ?? 0))}
          {row("UPI", formatPrice(s.byMethod.upi ?? 0))}
          {row("NC items", `${s.nc.count} · ${formatPrice(s.nc.value)}`)}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-3 space-y-1 text-xs">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Dhyan dene wali cheezein</p>
        {row("Cancelled / void KOT", s.cancelled.length)}
        {s.cancelled.slice(0, 8).map((c) => (
          <p key={c.kot} className="pl-3 text-slate-500">
            {c.kot} · {c.table} · {formatPrice(c.total)}
            {c.by ? ` · ${c.by}` : ""}
            {c.reason ? ` · "${c.reason}"` : ""}
          </p>
        ))}
        {row("Discount wale bills", s.discounts.length)}
        {row("Reopen / refund", s.reopened.length)}
        {row(
          "KOT print",
          `${s.kotPrint.printed} printed · ${s.kotPrint.notPrinted} not printed`,
        )}
        {row(
          "Khule tables (agle din jayenge)",
          s.openTables.count
            ? `${s.openTables.count} · ${formatPrice(s.openTables.total)}`
            : "0",
        )}
        {s.openTables.count > 0 && (
          <p className="pl-3 text-slate-500">{s.openTables.tables.join(", ")}</p>
        )}
      </div>

      <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/40 p-3 space-y-2.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Gin ke bharein</p>
        <label className="block">
          <span className="text-xs font-bold text-slate-700">
            Drawer mein cash (zaroori) — system: {formatPrice(s.cashExpected)}
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={cash}
            onChange={(e) => setCash(e.target.value)}
            className="input input-sm input-bordered w-full font-mono font-bold"
            placeholder="₹"
          />
          <span className={`text-xs font-bold ${diffCls(cashDiff)}`}>{diffText(cashDiff)}</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-xs font-bold text-slate-700">
              Card machine (optional) — {formatPrice(s.byMethod.card ?? 0)}
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={card}
              onChange={(e) => setCard(e.target.value)}
              className="input input-sm input-bordered w-full font-mono"
              placeholder="₹"
            />
            <span className={`text-xs font-bold ${diffCls(cardDiff)}`}>{diffText(cardDiff)}</span>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-700">
              UPI app (optional) — {formatPrice(s.byMethod.upi ?? 0)}
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={upi}
              onChange={(e) => setUpi(e.target.value)}
              className="input input-sm input-bordered w-full font-mono"
              placeholder="₹"
            />
            <span className={`text-xs font-bold ${diffCls(upiDiff)}`}>{diffText(upiDiff)}</span>
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-bold text-slate-700">
            Remark {cashDiff !== null && cashDiff !== 0 ? "(zaroori — cash mein fark hai)" : "(optional)"}
          </span>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={2}
            className="textarea textarea-bordered textarea-sm w-full"
          />
        </label>
        {needsPin && (
          <label className="block">
            <span className="text-xs font-bold text-rose-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> ₹{pinThreshold} se zyada fark — Manager PIN
            </span>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="input input-sm input-bordered w-full font-mono"
              autoComplete="off"
            />
          </label>
        )}
        <button
          onClick={submit}
          disabled={saving}
          className="btn btn-success w-full text-white font-black"
        >
          {saving ? <span className="loading loading-spinner loading-sm" /> : <ShieldCheck className="w-4 h-4" />}
          Audit Submit karein
        </button>
      </div>
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>{zReport}</div>
    </div>
  );
}
