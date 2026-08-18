"use client";

import Image from "next/image";
import { Phone, MessageCircle } from "lucide-react";
import type { IBranding, ILocation } from "@/types";

interface Props {
  branding: IBranding | null;
  location: ILocation | null;
  width: number;
  height: number;
}

export default function BackCoverPage({
  branding,
  location,
  width,
  height,
}: Props) {
  const qrUrl = location
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
        `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/menu?type=${location.type}&location=${location.code}`,
      )}`
    : null;

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden p-6"
      style={{
        width,
        height,
        background:
          "linear-gradient(160deg, #FFFDF9 0%, #FAF6F0 50%, #F5EFEB 100%)",
      }}
    >
      {/* Decorative Inset Frame */}
      <div className="absolute inset-4 rounded-2xl border border-amber-800/15 pointer-events-none" />
      <div className="absolute inset-5 rounded-xl border border-amber-800/10 pointer-events-none" />

      <div className="relative z-10 text-center px-8 flex flex-col items-center gap-4">
        <div className="w-16 h-0.5 bg-amber-500/40" />

        {branding?.logoUrl && (
          <div className="p-1 rounded-full bg-white border-2 border-amber-400 shadow-md">
            <Image
              src={branding.logoUrl}
              alt="logo"
              width={65}
              height={65}
              className="rounded-full object-cover"
            />
          </div>
        )}

        <div>
          <h2 className="font-playfair text-slate-900 text-2xl font-black tracking-widest uppercase">
            {branding?.restaurantName ?? "Taj Restaurant & Cafe"}
          </h2>
          {branding?.tagline && (
            <p className="text-amber-800 text-xs tracking-widest font-semibold italic mt-1">
              {branding.tagline}
            </p>
          )}
        </div>

        {/* Contact info */}
        <div className="flex flex-col gap-2 text-xs font-bold text-slate-800">
          {branding?.callNumber && (
            <div className="inline-flex items-center gap-2 justify-center bg-white border border-slate-200 px-4 py-1.5 rounded-full shadow-xs">
              <Phone className="w-3.5 h-3.5 text-amber-600" />
              <span>{branding.callNumber}</span>
            </div>
          )}
          {branding?.whatsappNumber && (
            <div className="inline-flex items-center gap-2 justify-center bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-1.5 rounded-full shadow-xs">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>+{branding.whatsappNumber}</span>
            </div>
          )}
        </div>

        {/* QR Code */}
        {qrUrl && (
          <div className="flex flex-col items-center gap-1.5 mt-2">
            <div className="p-2 bg-white rounded-2xl border-2 border-amber-300 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="QR Code"
                width={95}
                height={95}
                className="rounded-lg"
              />
            </div>
            <p className="text-slate-500 font-bold text-[11px] tracking-wider uppercase">
              Scan to open digital menu
            </p>
          </div>
        )}

        <div className="w-16 h-0.5 bg-amber-500/40 mt-1" />
      </div>

      <div className="absolute top-6 left-6 text-amber-700/20 text-2xl select-none">✦</div>
      <div className="absolute bottom-6 right-6 text-amber-700/20 text-2xl select-none">✦</div>
    </div>
  );
}
