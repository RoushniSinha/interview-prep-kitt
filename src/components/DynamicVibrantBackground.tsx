import React from 'react';

export const DynamicVibrantBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {/* Dynamic Base Gradient Canvas */}
      <div
        className="absolute inset-0 opacity-80 animate-aurora-flow"
        style={{
          backgroundImage: `
            radial-gradient(circle at 15% 20%, rgba(99, 102, 241, 0.45) 0%, transparent 55%),
            radial-gradient(circle at 85% 25%, rgba(6, 182, 212, 0.40) 0%, transparent 50%),
            radial-gradient(circle at 50% 80%, rgba(236, 72, 153, 0.35) 0%, transparent 55%),
            radial-gradient(circle at 20% 85%, rgba(16, 185, 129, 0.35) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(245, 158, 11, 0.30) 0%, transparent 45%)
          `,
          backgroundColor: '#f8fafc',
        }}
      />

      {/* Floating Radiant Orb 1: Electric Indigo / Purple */}
      <div
        className="absolute -top-32 -left-20 h-[560px] w-[560px] rounded-full blur-[110px] animate-float-orb-1 opacity-70"
        style={{
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.65) 0%, rgba(99, 102, 241, 0.35) 50%, transparent 80%)',
        }}
      />

      {/* Floating Radiant Orb 2: Electric Cyan / Sky Blue */}
      <div
        className="absolute top-1/4 -right-24 h-[620px] w-[620px] rounded-full blur-[120px] animate-float-orb-2 opacity-65"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.60) 0%, rgba(14, 165, 233, 0.35) 50%, transparent 75%)',
        }}
      />

      {/* Floating Radiant Orb 3: Radiant Emerald / Teal */}
      <div
        className="absolute bottom-10 left-1/4 h-[580px] w-[580px] rounded-full blur-[130px] animate-float-orb-3 opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.55) 0%, rgba(20, 184, 166, 0.30) 55%, transparent 80%)',
        }}
      />

      {/* Floating Radiant Orb 4: Vivid Magenta / Sunset Coral Amber */}
      <div
        className="absolute -bottom-28 right-1/4 h-[640px] w-[640px] rounded-full blur-[125px] animate-float-orb-4 opacity-55"
        style={{
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.55) 0%, rgba(245, 158, 11, 0.35) 50%, transparent 80%)',
        }}
      />

      {/* Ambient Pulsing Center Prism Glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[720px] w-[800px] rounded-full blur-[140px] animate-pulse-glow opacity-40"
        style={{
          background: 'radial-gradient(ellipse, rgba(168, 85, 247, 0.40) 0%, rgba(59, 130, 246, 0.25) 45%, transparent 70%)',
        }}
      />

      {/* Subtle Micro-Noise / Grid Matrix Overlay to enhance depth without banding */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  );
};
