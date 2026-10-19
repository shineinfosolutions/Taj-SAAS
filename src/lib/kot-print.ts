import type { IOrder } from "@/types";

// KOT "printed" marks only started saving once the mark-printed fix went live
// (19 Oct 2026, 22:27 IST). KOTs before that did print, but were never recorded.
export const KOT_PRINT_TRACKED_SINCE = new Date("2026-10-19T16:57:00Z").getTime();

export type KotPrintState = "printed" | "not_printed" | "untracked";

export function kotPrintState(
  o: Pick<IOrder, "kotPrinted" | "createdAt">,
): KotPrintState {
  if (o.kotPrinted) return "printed";
  if (new Date(o.createdAt).getTime() < KOT_PRINT_TRACKED_SINCE) return "untracked";
  return "not_printed";
}

export interface KotPrintSummary {
  printed: number;
  tracked: number; // KOTs whose print status is known
  status: "printed" | "partial" | "not_printed" | "untracked";
}

/** Print status of all KOTs on one bill. */
export function summarizeKotPrint(
  kots: Pick<IOrder, "kotPrinted" | "createdAt">[],
): KotPrintSummary {
  let printed = 0;
  let tracked = 0;
  for (const k of kots) {
    const s = kotPrintState(k);
    if (s === "untracked") continue;
    tracked += 1;
    if (s === "printed") printed += 1;
  }
  const status =
    tracked === 0
      ? "untracked"
      : printed === tracked
        ? "printed"
        : printed === 0
          ? "not_printed"
          : "partial";
  return { printed, tracked, status };
}
