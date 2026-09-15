"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, GitMerge, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { ILocation } from "@/types";

interface MergeTablesModalProps {
  tables: ILocation[]; // the tables the captain selected (>= 2)
  onClose: () => void;
  onMerged: () => void;
}

export default function MergeTablesModal({
  tables,
  onClose,
  onMerged,
}: MergeTablesModalProps) {
  const [primaryId, setPrimaryId] = useState(tables[0]?._id ?? "");
  const [loading, setLoading] = useState(false);

  const others = tables.filter((t) => t._id !== primaryId);

  const handleMerge = async () => {
    if (!primaryId || others.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/orders/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableIds: others.map((t) => t._id),
          intoTableId: primaryId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Merge failed");
      const primary = tables.find((t) => t._id === primaryId);
      toast.success(`Tables merged into ${primary?.code ?? "table"}`);
      onMerged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Merge failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-amber-200 overflow-hidden text-slate-900"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-amber-50 to-amber-100/70 px-5 py-4 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <GitMerge className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-amber-950">
                  Merge Tables
                </h3>
                <p className="text-xs font-bold text-amber-800">
                  {tables.length} tables selected
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-white/80 hover:text-slate-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Bill on which table?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {tables.map((t) => (
                  <button
                    key={t._id}
                    type="button"
                    onClick={() => setPrimaryId(t._id)}
                    className={`rounded-xl border-2 p-2.5 text-center font-black transition-colors ${
                      primaryId === t._id
                        ? "border-amber-500 bg-amber-100 text-amber-950"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {t.code}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 font-semibold pt-1">
                Other tables&apos; KOTs move here. They stay occupied — no new
                orders — until this bill is settled.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleMerge}
                disabled={loading || others.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm Merge
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
