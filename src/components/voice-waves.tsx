"use client";

import React from "react";

export function VoiceWaves() {
  return (
    <>
      <div className="pointer-events-none absolute -inset-4 flex items-center justify-center">
        <div className="flex items-center justify-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className="w-1 bg-white rounded-full"
              style={{
                height: "8px",
                animation: "wave 1s ease-in-out infinite",
                animationDelay: `${i * 0.1}s`,
                transformOrigin: "bottom",
              }}
            />
          ))}
        </div>
      </div>
      <style jsx>{`
        @keyframes wave {
          0%, 100% {
            transform: scaleY(0.3);
          }
          50% {
            transform: scaleY(1);
          }
        }
      `}</style>
    </>
  );
}
