"use client";

import Image from "next/image";
import { UtensilsCrossed, Star, Play } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useItemVideoStore } from "@/store/itemVideo";
import { useFlyToCartStore } from "@/store/flyToCart";
import { formatPrice } from "@/lib/utils";
import type { CategoryWithItems, IItem } from "@/types";
import { FssaiDot } from "@/components/ui/FssaiDot";
import FoodPlaceholder from "@/components/menu/FoodPlaceholder";

interface Props {
  category: CategoryWithItems;
  items: IItem[];
  chunkIndex: number;
  totalChunks: number;
  isRoom: boolean;
  width: number;
  height: number;
  logoUrl?: string | null;
}

export default function MenuPage({
  category,
  items,
  chunkIndex,
  totalChunks,
  width,
  height,
  logoUrl,
}: Props) {
  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden select-none"
      style={{ width, height, background: "var(--menu-page-bg, #FAF9F6)" }}
    >
      {/* Category header */}
      <div className="px-6 py-3.5 border-b border-amber-200/50 flex items-center justify-between shrink-0 bg-amber-50/50">
        <div className="flex items-center gap-3">
          {category.iconEmoji ? (
            <span className="text-2xl">{category.iconEmoji}</span>
          ) : (
            <UtensilsCrossed className="w-5 h-5 text-amber-700" />
          )}
          <div>
            <h2 className="font-playfair text-slate-900 text-lg sm:text-xl font-black tracking-tight">
              {category.name}
            </h2>
            {totalChunks > 1 && (
              <p className="text-amber-800 text-xs font-semibold">
                Page {chunkIndex + 1} of {totalChunks}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Items grid — 3 columns × 2 rows (original size) */}
      <div className="flex-1 p-3.5 grid grid-cols-3 gap-3 content-start overflow-hidden">
        {items.map((item) => (
          <TabletItemCard
            key={item._id}
            item={item}
            logoUrl={logoUrl}
          />
        ))}
      </div>
    </div>
  );
}

function TabletItemCard({
  item,
  logoUrl,
}: {
  item: IItem;
  logoUrl?: string | null;
}) {
  const {
    items: cartItems,
    addItem,
    updateQuantity,
    removeItem,
  } = useCartStore();
  const openVideo = useItemVideoStore((s) => s.open);
  const triggerFly = useFlyToCartStore((s) => s.triggerFly);

  const cartItem = cartItems.find((i) => i.itemId === item._id);
  const qty = cartItem?.quantity ?? 0;

  const handleAdd = () =>
    addItem({
      itemId: item._id,
      name: item.name,
      price: item.price,
      discountPrice: item.discountPrice,
      quantity: 1,
      imageUrl: item.imageUrl,
      isVegetarian: item.isVegetarian,
    });

  const hasVideo = !!item.videoUrl;

  return (
    <div
      className={`flex flex-col bg-white rounded-2xl overflow-hidden border transition-all hover:shadow-md hover:border-amber-400 shadow-sm ${
        item.isFeatured ? "border-amber-400 ring-1 ring-amber-400/40" : "border-slate-200/90"
      }`}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full bg-slate-100 shrink-0 overflow-hidden">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 33vw, 200px"
          />
        ) : (
          <FoodPlaceholder logoUrl={logoUrl} />
        )}

        {/* Veg/Non-veg indicator */}
        <div className="absolute top-1.5 left-1.5 z-10 drop-shadow">
          <FssaiDot isVeg={item.isVegetarian} size="sm" />
        </div>

        {/* Play video button */}
        {hasVideo && (
          <button
            onClick={() => openVideo(item)}
            aria-label={`Play ${item.name} video`}
            className="absolute inset-0 flex items-center justify-center cursor-pointer touch-manipulation group z-10"
          >
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90 group-hover:scale-105 pointer-events-none"
              style={{
                background: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.7)",
              }}
            >
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </span>
          </button>
        )}

        {item.isFeatured && (
          <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold z-10 bg-amber-400 text-black shadow">
            <Star className="w-2 h-2 fill-black" /> Special
          </span>
        )}
      </div>

      {/* Info & Bottom Action Row */}
      <div className="p-2.5 flex flex-col justify-between flex-1 gap-1.5 bg-white">
        {hasVideo ? (
          <button
            type="button"
            onClick={() => openVideo(item)}
            className="text-left cursor-pointer"
          >
            <p className="text-slate-900 text-xs font-black line-clamp-1 leading-snug hover:text-amber-700">
              {item.name}
            </p>
          </button>
        ) : (
          <p className="text-slate-900 text-xs font-black line-clamp-1 leading-snug">
            {item.name}
          </p>
        )}

        <div className="flex items-center justify-between gap-1 mt-auto pt-1.5 border-t border-slate-100">
          <div className="flex items-baseline gap-1">
            <span className="text-amber-700 text-xs md:text-sm font-black font-mono tracking-tight">
              {formatPrice(item.discountPrice ?? item.price)}
            </span>
            {item.discountPrice && (
              <span className="text-slate-400 text-[10px] line-through font-mono">
                {formatPrice(item.price)}
              </span>
            )}
          </div>

          <div
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {qty === 0 ? (
              <button
                onClick={(e) => {
                  triggerFly(e.currentTarget, item.imageUrl);
                  handleAdd();
                }}
                aria-label={`Add ${item.name} to order`}
                className="bg-amber-500 hover:bg-amber-600 active:scale-90 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] cursor-pointer touch-manipulation transition-all shadow-xs flex items-center gap-0.5"
              >
                ADD +
              </button>
            ) : (
              <div className="flex items-center bg-amber-50 rounded-lg h-6 border border-amber-300 px-0.5">
                <button
                  onClick={() =>
                    qty === 1
                      ? removeItem(item._id)
                      : updateQuantity(item._id, qty - 1)
                  }
                  aria-label={`Decrease ${item.name} quantity`}
                  className="text-amber-800 font-extrabold text-xs w-5 h-full flex items-center justify-center cursor-pointer active:scale-75"
                >
                  −
                </button>
                <span className="text-slate-900 font-extrabold text-xs tabular-nums px-1 min-w-4 text-center">
                  {qty}
                </span>
                <button
                  onClick={(e) => {
                    triggerFly(e.currentTarget, item.imageUrl);
                    updateQuantity(item._id, qty + 1);
                  }}
                  aria-label={`Increase ${item.name} quantity`}
                  className="text-amber-800 font-extrabold text-xs w-5 h-full flex items-center justify-center cursor-pointer active:scale-75"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
