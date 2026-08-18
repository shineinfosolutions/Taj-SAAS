"use client";

import { UtensilsCrossed } from "lucide-react";
import type { CategoryWithItems } from "@/types";

interface Props {
  categories: CategoryWithItems[];
  onCategoryClick: (catId: string) => void;
  width: number;
  height: number;
}

export default function CategoryIndexPage({
  categories,
  onCategoryClick,
  width,
  height,
}: Props) {
  return (
    <div
      className="w-full h-full flex flex-col px-8 pt-12 pb-8 overflow-hidden"
      style={{ width, height, background: "var(--menu-page-bg, #FAF9F6)" }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="mb-6 text-center">
        <p className="text-amber-800 text-xs font-bold tracking-widest uppercase mb-1">
          ✦ Contents ✦
        </p>
        <h2 className="font-playfair text-slate-900 text-2xl sm:text-3xl font-black tracking-tight">
          Our Menu
        </h2>
        <div className="w-16 h-0.5 bg-amber-400 mx-auto mt-3 rounded-full" />
      </div>

      <div className="flex-1 grid grid-cols-2 gap-3.5 overflow-hidden content-start">
        {categories.map((cat, idx) => (
          <button
            key={cat._id}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => {
              e.stopPropagation();
              onCategoryClick(cat._id);
            }}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Jump to ${cat.name}, ${cat.items.length} items`}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:border-amber-400 hover:bg-amber-50/50 hover:shadow-md transition-all text-left group cursor-pointer touch-manipulation active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
              {cat.iconEmoji ? (
                cat.iconEmoji
              ) : (
                <UtensilsCrossed className="w-5 h-5 text-amber-700" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-slate-900 text-sm font-extrabold truncate group-hover:text-amber-700 transition-colors">
                {cat.name}
              </p>
              <p className="text-slate-500 text-xs font-medium">{cat.items.length} items</p>
            </div>
            <span className="ml-auto text-amber-800/80 text-xs font-mono font-bold tabular-nums bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
              {String(idx + 1).padStart(2, "0")}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 text-center">
        <p className="text-slate-500 text-xs font-medium tracking-wider">
          Tap any category to jump to it
        </p>
      </div>
    </div>
  );
}
