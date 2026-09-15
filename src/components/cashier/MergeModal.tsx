"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, GitMerge } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils";
import type { TableBill } from "@/app/api/orders/cashier/route";

interface MergeModalProps {
  table: TableBill;
  otherTables: TableBill[];
  onClose: () => void;
  onMerged: () => void;
}

export default function MergeModal({
  table,
  otherTables,
  onClose,
  onMerged,
}: MergeModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMerge = async () => {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/orders/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableIds: Array.from(selected),
          intoTableId: table.tableId,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error);
      }
      toast.success("Tables merged");
      onMerged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Merge failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-base-100 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-300 bg-info/5">
            <div>
              <h2 className="font-bold text-lg flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-info" />
                Merge Tables
              </h2>
              <p className="text-sm text-base-content/60">
                Fold other tables&apos; bills into {table.tableLabel}
              </p>
            </div>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-circle btn-sm"
              aria-label="Close merge modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4">
            {otherTables.length === 0 ? (
              <p className="text-sm text-base-content/60 text-center py-6">
                No other occupied tables to merge right now.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto">
                {otherTables.map((t) => (
                  <button
                    key={t.tableId}
                    onClick={() => toggle(t.tableId)}
                    className={`rounded-xl border p-3 text-left transition-colors flex items-center justify-between ${
                      selected.has(t.tableId)
                        ? "border-info bg-info/15 ring-2 ring-info"
                        : "border-base-300"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold">{t.tableLabel}</div>
                      <div className="text-[11px] opacity-70">
                        {t.kots.length} KOT{t.kots.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-sm">
                      {formatPrice(t.total)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {selected.size > 0 && (
              <p className="text-xs text-warning bg-warning/10 rounded-lg px-3 py-2">
                {selected.size} table{selected.size !== 1 ? "s" : ""} will merge into{" "}
                {table.tableLabel}. They stay occupied until this bill is settled.
              </p>
            )}

            <button
              onClick={handleMerge}
              disabled={selected.size === 0 || loading}
              className="btn btn-info btn-lg w-full"
            >
              {loading ? (
                <span className="loading loading-spinner" />
              ) : (
                `Merge ${selected.size || ""} Table${selected.size !== 1 ? "s" : ""}`
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
