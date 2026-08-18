"use client";

import Image from "next/image";
import type { IBranding } from "@/types";

interface Props {
  branding: IBranding | null;
  width: number;
  height: number;
}

export default function CoverPage({ branding, width, height }: Props) {
  return (
    <div
      className="relative w-full h-full overflow-hidden flex flex-col items-center justify-center"
      style={{
        width,
        height,
        background:
          "linear-gradient(135deg, #FAF8F5 0%, #F3ECE2 50%, #EAE0D3 100%)",
      }}
    >
      {/* Cover background — video takes priority, falls back to image */}
      {branding?.coverVideoUrl ? (
        <video
          src={branding.coverVideoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : branding?.coverImageUrl ? (
        <Image
          src={branding.coverImageUrl}
          alt="cover"
          fill
          className="object-cover"
          priority
        />
      ) : null}

      {/* Luxury Cinematic Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/15 to-slate-950/75 pointer-events-none" />

      {/* Decorative Inset Luxury Frame */}
      <div className="absolute inset-4 rounded-2xl border border-amber-400/40 pointer-events-none shadow-inner" />
      <div className="absolute inset-5 rounded-xl border border-amber-400/25 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center px-8 flex flex-col items-center gap-3.5">
        {branding?.logoUrl && (
          <div className="p-1 rounded-full bg-white/95 border-2 border-amber-400 shadow-2xl">
            <Image
              src={branding.logoUrl ?? "/tajlogo.png"}
              alt="logo"
              width={75}
              height={75}
              className="rounded-full object-cover"
            />
          </div>
        )}
        <h1 className="font-playfair text-white text-3xl sm:text-4xl font-black tracking-widest uppercase drop-shadow-lg">
          {branding?.restaurantName ?? "Taj Restaurant & Cafe"}
        </h1>
        {branding?.tagline && (
          <p className="text-amber-200 text-xs sm:text-sm tracking-widest font-medium italic drop-shadow-md">
            {branding.tagline}
          </p>
        )}
        <div className="w-16 h-0.5 bg-amber-400/80 mt-1 shadow-xs" />
        <p className="text-amber-200 text-xs tracking-[0.4em] font-black uppercase drop-shadow-sm">
          Menu
        </p>
      </div>

      {/* Corner ornaments */}
      <div className="absolute top-6 left-6 text-amber-400/60 text-2xl select-none">✦</div>
      <div className="absolute top-6 right-6 text-amber-400/60 text-2xl select-none">✦</div>
      <div className="absolute bottom-6 left-6 text-amber-400/60 text-2xl select-none">✦</div>
      <div className="absolute bottom-6 right-6 text-amber-400/60 text-2xl select-none">✦</div>
    </div>
  );
}
