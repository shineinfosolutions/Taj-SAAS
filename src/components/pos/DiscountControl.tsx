"use client";

import { useState } from "react";
import { Tag, ShieldCheck } from "lucide-react";
import { computeDiscount, type DiscountConfig } from "@/lib/discount";

/**
 * Discount state + live math for a bill. Parent supplies the config (net, gst
 * rate, limits). Returns everything needed to render the control + settle:
 *   disc.calc.payable  — amount due after discount
 *   disc.calc.error    — blocking validation error (disable Collect)
 *   disc.calc.payload  — { discountType, discountValue, discountReason, managerPin }
 */
export function useDiscount(cfg: DiscountConfig) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"percent" | "flat">("percent");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [pin, setPin] = useState("");
  const calc = computeDiscount(
    { type, value: parseFloat(value) || 0, reason, pin },
    cfg,
  );
  const reset = () => {
    setOpen(false);
    setValue("");
    setReason("");
    setPin("");
  };
  return {
    open, setOpen, type, setType, value, setValue,
    reason, setReason, pin, setPin, calc, cfg, reset,
  };
}

export type DiscountState = ReturnType<typeof useDiscount>;

export default function DiscountControl({ d }: { d: DiscountState }) {
  const { cfg, calc } = d;
  return (
    <div className="rounded-xl border border-base-300 p-3">
      {!d.open ? (
        <button
          type="button"
          onClick={() => d.setOpen(true)}
          className="btn btn-xs btn-ghost gap-1.5 text-warning"
        >
          <Tag className="w-3.5 h-3.5" /> Add discount
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-warning" /> Discount
              <span className="text-[11px] font-normal text-base-content/40">
                max {cfg.maxPercent}%
              </span>
            </p>
            <button
              type="button"
              onClick={d.reset}
              className="btn btn-xs btn-ghost"
            >
              Remove
            </button>
          </div>

          <div className="flex gap-2">
            <div className="join">
              <button
                type="button"
                onClick={() => d.setType("percent")}
                className={`join-item btn btn-sm ${d.type === "percent" ? "btn-warning" : "btn-outline"}`}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => d.setType("flat")}
                className={`join-item btn btn-sm ${d.type === "flat" ? "btn-warning" : "btn-outline"}`}
              >
                Rs.
              </button>
            </div>
            <input
              type="number"
              value={d.value}
              onChange={(e) => d.setValue(e.target.value)}
              className="input input-bordered input-sm flex-1"
              placeholder={d.type === "percent" ? "e.g. 10" : "e.g. 50"}
              min={0}
              max={d.type === "percent" ? 100 : undefined}
              step="0.01"
            />
          </div>

          {cfg.requiresReason && (
            <input
              type="text"
              value={d.reason}
              onChange={(e) => d.setReason(e.target.value)}
              className="input input-bordered input-sm w-full"
              placeholder="Reason (required) — loyalty, staff, manager comp"
            />
          )}

          {calc.needsPin && (
            <label className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/5 px-2.5 py-1.5">
              <ShieldCheck className="w-4 h-4 text-warning shrink-0" />
              <input
                type="password"
                inputMode="numeric"
                value={d.pin}
                onChange={(e) => d.setPin(e.target.value)}
                className="input input-bordered input-sm flex-1"
                placeholder={`Manager PIN (needed over ${cfg.threshold}%)`}
                autoComplete="off"
              />
            </label>
          )}

          {calc.error ? (
            <p className="text-xs text-error font-medium">{calc.error}</p>
          ) : (
            calc.amount > 0 && (
              <p className="text-xs text-warning">
                − Rs.{calc.amount.toFixed(2)} off
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}
