"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useItemVideoStore } from "@/store/itemVideo";

/**
 * Full-screen video player for the tablet menu. Opens when a guest taps a
 * dish that has a clip. Plays with sound + native controls (user-initiated,
 * so autoplay-with-audio is allowed).
 */
export default function TabletVideoModal() {
  const { item, close } = useItemVideoStore();

  return (
    <AnimatePresence>
      {item?.videoUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 flex items-center justify-center p-6"
          style={{
            zIndex: 10000,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
          }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl rounded-2xl overflow-hidden"
            style={{ border: "1px solid var(--menu-border)" }}
          >
            <video
              src={item.videoUrl}
              poster={item.imageUrl}
              autoPlay
              loop
              controls
              playsInline
              className="w-full max-h-[80vh] bg-black object-contain"
            />
            <div
              className="absolute bottom-0 left-0 right-0 px-4 py-3 pointer-events-none"
              style={{
                background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
              }}
            >
              <p className="text-white font-semibold text-lg">{item.name}</p>
            </div>
            <button
              onClick={close}
              aria-label="Close video"
              className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer touch-manipulation active:opacity-70"
              style={{ background: "rgba(0,0,0,0.6)" }}
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
