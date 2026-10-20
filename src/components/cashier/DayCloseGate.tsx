"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import DayCloseForm from "@/components/reports/DayCloseForm";
import { businessDayLabel } from "@/lib/business-day";

interface DayCloseStatus {
  currentBusinessDate: string;
  enforced: boolean;
  lockEnabled: boolean;
  pending: string[];
  blocked: boolean;
  pinThreshold: number;
}

/** Fired (e.g. by the payment popup on HTTP 423) to bring the audit back up. */
export const DAY_CLOSE_EVENT = "day-close-required";

/**
 * Cashier day-close gate. While the previous business day is unaudited (and
 * the lock is on) it shows the audit popup; payments are refused by the server
 * until it is submitted. The popup can be minimised so the cashier can keep
 * taking orders — orders and KOTs are never blocked.
 */
export default function DayCloseGate() {
  const qc = useQueryClient();
  const [minimized, setMinimized] = useState(false);

  const { data } = useQuery<DayCloseStatus>({
    queryKey: ["day-close-status"],
    queryFn: async () => {
      const r = await fetch("/api/day-close", { cache: "no-store" });
      if (!r.ok) throw new Error("day-close status failed");
      return r.json();
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const reopen = () => {
      setMinimized(false);
      qc.invalidateQueries({ queryKey: ["day-close-status"] });
    };
    window.addEventListener(DAY_CLOSE_EVENT, reopen);
    return () => window.removeEventListener(DAY_CLOSE_EVENT, reopen);
  }, [qc]);

  if (!data?.blocked || !data.pending.length) return null;
  const date = data.pending[0];

  const done = () => {
    qc.invalidateQueries({ queryKey: ["day-close-status"] });
    qc.invalidateQueries({ queryKey: ["cashier-tables"] });
    qc.invalidateQueries({ queryKey: ["invoice-summary-today"] });
  };

  if (minimized) {
    return (
      <div className="shrink-0 bg-rose-600 text-white px-4 py-1.5 flex items-center justify-between gap-3 text-xs font-bold">
        <span className="flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4" />
          Day-close audit pending for {date} — payments are blocked until it is done. Orders and KOTs keep working.
        </span>
        <button
          onClick={() => setMinimized(false)}
          className="btn btn-xs bg-white text-rose-700 border-none font-black"
        >
          Do Audit
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white text-slate-900 rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 z-10 bg-rose-600 text-white px-4 py-3 rounded-t-2xl flex items-start justify-between gap-3">
          <div>
            <p className="font-black flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Day Close Audit Pending
            </p>
            <p className="text-xs text-white/90">
              Business day {businessDayLabel(date)} — billing resumes after the audit.
              {data.pending.length > 1 && ` (${data.pending.length} days pending)`}
            </p>
          </div>
          <button
            onClick={() => setMinimized(true)}
            className="btn btn-xs bg-white/15 hover:bg-white/25 text-white border-white/30 shrink-0"
            title="Minimise — orders keep working, payments stay blocked"
          >
            Later (orders only)
          </button>
        </div>
        <div className="p-4">
          <DayCloseForm
            key={date}
            businessDate={date}
            pinThreshold={data.pinThreshold}
            onDone={done}
          />
        </div>
      </div>
    </div>
  );
}
